import { json } from "@react-router/node";
import { prisma } from "../lib/prisma.server.js";
import { sendMail } from "../lib/mail.server.js";

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseItems(rawItems) {
  try {
    if (!rawItems) return [];
    if (Array.isArray(rawItems)) return rawItems;

    const parsed = JSON.parse(rawItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Items konnten nicht gelesen werden:", error);
    return [];
  }
}

function centsToEuro(cents) {
  const value = Number(cents || 0) / 100;
  if (Number.isNaN(value)) return 0;
  return value;
}

function euroText(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function isTruthy(value) {
  return value === true || value === "true" || value === "Ja" || value === "1";
}

function makeOrderNumber() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `LMB-${yyyy}${mm}${dd}-${random}`;
}

function parseDeliveryDate(dateValue, timeValue) {
  const date = safeText(dateValue);
  const time = safeText(timeValue) || "00:00";

  if (!date) return null;

  const parsed = new Date(`${date}T${time}:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeOrderData(data) {
  const customerEmail =
    data.customerEmail ||
    data.portalCustomerEmail ||
    data.contactEmail ||
    "";

  const customerName =
    data.customerName ||
    data.portalCustomerName ||
    data.contactName ||
    "";

  const customerCompany =
    data.customerCompany ||
    data.portalCustomerCompany ||
    data.deliveryCompany ||
    data.billingCompany ||
    "";

  return {
    ...data,

    portalCustomerId: safeText(data.portalCustomerId || data.portalUserId || ""),

    customerEmail: safeText(customerEmail).toLowerCase(),
    customerName: safeText(customerName),
    customerCompany: safeText(customerCompany),

    contactEmail: safeText(
      data.contactEmail || data.customerEmail || data.portalCustomerEmail || ""
    ).toLowerCase(),

    contactName: safeText(
      data.contactName || data.customerName || data.portalCustomerName || ""
    ),

    contactPhone: safeText(data.contactPhone || data.customerPhone || ""),

    deliveryType: safeText(data.deliveryType || ""),
    deliveryDate: safeText(data.deliveryDate || ""),
    deliveryTime: safeText(data.deliveryTime || ""),
    eventTime: safeText(data.eventTime || ""),

    deliveryCompany: safeText(data.deliveryCompany || customerCompany),
    deliveryStreet: safeText(data.deliveryStreet || ""),
    deliveryZip: safeText(data.deliveryZip || ""),
    deliveryCity: safeText(data.deliveryCity || ""),
    deliveryExtra: safeText(data.deliveryExtra || ""),

    billingCompany: safeText(data.billingCompany || customerCompany),
    billingStreet: safeText(data.billingStreet || ""),
    billingZip: safeText(data.billingZip || ""),
    billingCity: safeText(data.billingCity || ""),
    billingExtra: safeText(data.billingExtra || ""),

    costCenterName: safeText(data.costCenterName || data.portalCostCenterName || ""),
    costCenterCode: safeText(data.costCenterCode || data.portalCostCenterCode || ""),

    internalReference: safeText(data.internalReference || ""),
    note: safeText(data.note || ""),

    invoiceAllowed: isTruthy(data.invoiceAllowed || data.invoiceApproved),

    subtotalAmountCents:
      data.subtotalAmountCents ||
      data.cartTotalCents ||
      data.totalAmountCents ||
      0,

    taxAmountCents: data.taxAmountCents || 0,

    totalAmountCents:
      data.totalAmountCents ||
      data.cartTotalCents ||
      data.subtotalAmountCents ||
      0,

    currency: safeText(data.currency || "EUR"),

    items: parseItems(data.items),
  };
}

async function findOrCreateOrderUser(data) {
  if (data.portalCustomerId) {
    const userById = await prisma.portalUser.findUnique({
      where: {
        id: data.portalCustomerId,
      },
    });

    if (userById) return userById;
  }

  if (data.contactEmail || data.customerEmail) {
    const email = data.contactEmail || data.customerEmail;

    const userByEmail = await prisma.portalUser.findFirst({
      where: {
        email,
      },
    });

    if (userByEmail) return userByEmail;
  }

  const email =
    data.contactEmail ||
    data.customerEmail ||
    `gast-${Date.now()}@letmebowl.local`;

  const usernameBase =
    email.includes("@") ? email.split("@")[0] : `gast-${Date.now()}`;

  let username = usernameBase.toLowerCase().replace(/[^a-z0-9._-]/g, "-");

  const existingUsername = await prisma.portalUser.findUnique({
    where: {
      username,
    },
  });

  if (existingUsername) {
    username = `${username}-${Date.now()}`;
  }

  const nameParts = safeText(data.contactName || data.customerName).split(" ");

  const firstName = nameParts[0] || "Gast";
  const lastName = nameParts.slice(1).join(" ") || "Bestellung";

  const user = await prisma.portalUser.create({
    data: {
      companyName: data.customerCompany || data.billingCompany || data.deliveryCompany || "Gastbestellung",
      firstName,
      lastName,
      username,
      email,
      phone: data.contactPhone || "",
      passwordHash: "NO_LOGIN_ORDER_USER",

      isActive: false,
      isAdmin: false,
      role: "ORDERER",
      mustResetPassword: false,
      invoicePurchaseEnabled: false,
    },
  });

  return user;
}

function buildOwnerEmailText(data, orderNumber) {
  const itemsText = data.items
    .map((item) => {
      return `- ${safeText(item.title)} | Menge: ${item.quantity || 1} | Summe: ${euroText(
        centsToEuro(item.totalPriceCents || 0)
      )}`;
    })
    .join("\n");

  return `
Neue Let Me Bowl Bestellung

Bestellnummer: ${orderNumber}

Kunde:
Firma: ${data.customerCompany || "-"}
Kontakt: ${data.contactName || data.customerName || "-"}
E-Mail: ${data.contactEmail || data.customerEmail || "-"}
Telefon: ${data.contactPhone || "-"}

Termin:
Lieferart: ${data.deliveryType || "-"}
Datum: ${data.deliveryDate || "-"}
Zeit: ${data.deliveryTime || "-"}
Eventbeginn: ${data.eventTime || "-"}

Kostenstelle:
${data.costCenterName || "-"} ${data.costCenterCode ? "· " + data.costCenterCode : ""}

Artikel:
${itemsText || "Keine Artikel übermittelt."}

Gesamt:
${euroText(centsToEuro(data.totalAmountCents))}

Lieferadresse:
Firma: ${data.deliveryCompany || "-"}
Straße: ${data.deliveryStreet || "-"}
PLZ/Ort: ${data.deliveryZip || "-"} ${data.deliveryCity || ""}
Zusatz: ${data.deliveryExtra || "-"}

Rechnungsadresse:
Firma: ${data.billingCompany || "-"}
Straße: ${data.billingStreet || "-"}
PLZ/Ort: ${data.billingZip || "-"} ${data.billingCity || ""}
Zusatz: ${data.billingExtra || "-"}

Hinweise:
${data.internalReference || "-"}

Technische Notiz:
${data.note || "-"}
  `.trim();
}

function buildCustomerEmailText(data, orderNumber) {
  const itemsText = data.items
    .map((item) => {
      return `- ${safeText(item.title)} | Menge: ${item.quantity || 1} | Summe: ${euroText(
        centsToEuro(item.totalPriceCents || 0)
      )}`;
    })
    .join("\n");

  return `
Vielen Dank für deine Bestellung.

Wir haben deine Firmenbestellung erhalten und prüfen die Angaben.

Bestellnummer: ${orderNumber}

Übersicht:
Firma: ${data.customerCompany || "-"}
Kontakt: ${data.contactName || data.customerName || "-"}
Lieferart: ${data.deliveryType || "-"}
Datum: ${data.deliveryDate || "-"}
Zeit: ${data.deliveryTime || "-"}
Eventbeginn: ${data.eventTime || "-"}

Artikel:
${itemsText || "Keine Artikel übermittelt."}

Gesamt:
${euroText(centsToEuro(data.totalAmountCents))}

Die Rechnung folgt separat nach dem vereinbarten Abrechnungsprozess.
  `.trim();
}

export async function action({ request }) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let rawData = {};

    if (contentType.includes("application/json")) {
      rawData = await request.json();
    } else {
      const formData = await request.formData();

      for (const [key, value] of formData.entries()) {
        rawData[key] = value;
      }
    }

    const data = normalizeOrderData(rawData);

    const user = await findOrCreateOrderUser(data);

    const orderNumber = makeOrderNumber();

    const deliveryDate = parseDeliveryDate(data.deliveryDate, data.deliveryTime);

    const referenceParts = [];

    if (data.costCenterName) referenceParts.push(data.costCenterName);
    if (data.costCenterCode) referenceParts.push(data.costCenterCode);
    if (data.internalReference) referenceParts.push(data.internalReference);

    const order = await prisma.portalOrder.create({
      data: {
        userId: user.id,
        orderNumber,
        orderType: data.deliveryType || null,
        status: "OPEN",
        currency: data.currency || "EUR",

        billingContactName: data.contactName || data.customerName || null,
        billingEmail: data.contactEmail || data.customerEmail || null,
        billingPhone: data.contactPhone || null,
        billingCompanyName: data.billingCompany || data.customerCompany || null,

        referenceNumber: referenceParts.filter(Boolean).join(" · ") || null,

        subtotalAmount: centsToEuro(data.subtotalAmountCents),
        taxAmount: centsToEuro(data.taxAmountCents),
        totalAmount: centsToEuro(data.totalAmountCents),

        notes: [
          data.note || "",
          data.internalReference ? `Hinweis: ${data.internalReference}` : "",
          data.deliveryType ? `Lieferart: ${data.deliveryType}` : "",
          data.deliveryDate ? `Datum: ${data.deliveryDate}` : "",
          data.deliveryTime ? `Zeit: ${data.deliveryTime}` : "",
          data.eventTime ? `Eventbeginn: ${data.eventTime}` : "",
          data.deliveryStreet || data.deliveryCity
            ? `Lieferadresse: ${data.deliveryCompany || ""}, ${data.deliveryStreet || ""}, ${data.deliveryZip || ""} ${data.deliveryCity || ""}, ${data.deliveryExtra || ""}`
            : "",
          data.billingStreet || data.billingCity
            ? `Rechnungsadresse: ${data.billingCompany || ""}, ${data.billingStreet || ""}, ${data.billingZip || ""} ${data.billingCity || ""}, ${data.billingExtra || ""}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),

        deliveryDate,

        items: {
          create: data.items.map((item) => ({
            title: safeText(item.title) || "Artikel",
            quantity: Number(item.quantity || 1),
            unit: safeText(item.unit || ""),
            unitPrice: centsToEuro(item.unitPriceCents || 0),
            totalPrice: centsToEuro(item.totalPriceCents || 0),
            notes: safeText(item.notes || ""),

            shopifyProductId:
              item.productId !== null && item.productId !== undefined
                ? String(item.productId)
                : null,

            shopifyVariantId:
              item.variantId !== null && item.variantId !== undefined
                ? String(item.variantId)
                : null,

            shopifyHandle: safeText(item.handle || ""),
            variantTitle: safeText(item.variantTitle || ""),
            sku: safeText(item.sku || ""),
          })),
        },
      },
      include: {
        items: true,
        user: true,
      },
    });

    try {
      const ownerEmail =
        process.env.ORDER_NOTIFICATION_EMAIL ||
        process.env.ORDER_MAIL_TO ||
        "info@letmebowl-catering.de";

      await sendMail({
        to: ownerEmail,
        subject: `Neue Bestellung: ${order.orderNumber} – ${
          data.customerCompany || data.contactName || "Kunde"
        }`,
        text: buildOwnerEmailText(data, order.orderNumber),
      });

      if (data.contactEmail || data.customerEmail) {
        await sendMail({
          to: data.contactEmail || data.customerEmail,
          subject: "Deine Bestellung bei Let Me Bowl wurde erhalten",
          text: buildCustomerEmailText(data, order.orderNumber),
        });
      }
    } catch (mailError) {
      console.error("Bestellung wurde gespeichert, aber E-Mail konnte nicht gesendet werden:", mailError);
    }

    return json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("api.portal-order Fehler:", error);

    return json(
      {
        ok: false,
        error: "Bestellung konnte nicht gespeichert werden.",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}