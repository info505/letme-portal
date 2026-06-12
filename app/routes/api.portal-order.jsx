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
  return Number(value.toFixed(2));
}
function normalizeCents(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? Math.round(number) : 0;
}

function getItemUnitPriceCents(item) {
  return normalizeCents(
    item.unitPriceCents ??
      item.finalPrice ??
      item.final_price ??
      item.priceCents ??
      item.price ??
      0
  );
}

function getItemTotalPriceCents(item) {
  const directTotal = normalizeCents(
    item.totalPriceCents ??
      item.finalLinePrice ??
      item.final_line_price ??
      item.linePriceCents ??
      item.linePrice ??
      0
  );

  if (directTotal > 0) {
    return directTotal;
  }

  const quantity = Math.max(1, Number(item.quantity || 1));
  return getItemUnitPriceCents(item) * quantity;
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

async function makeOrderNumber() {
  const now = new Date();

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const getPart = (type) =>
    dateParts.find((part) => part.type === type)?.value || "00";

  const yyyy = getPart("year");
  const yy = yyyy.slice(-2);
  const mm = getPart("month");
  const dd = getPart("day");

  const berlinDate = `${yyyy}-${mm}-${dd}`;

  const startOfDay = new Date(`${berlinDate}T00:00:00+02:00`);
  const endOfDay = new Date(`${berlinDate}T23:59:59.999+02:00`);

  const countToday = await prisma.portalOrder.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(3, "0");

  return `LMB-${yy}${mm}${dd}-${sequence}`;
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

    costCenterName: safeText(
      data.costCenterName || data.portalCostCenterName || ""
    ),
    costCenterCode: safeText(
      data.costCenterCode || data.portalCostCenterCode || ""
    ),

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

  const usernameBase = email.includes("@")
    ? email.split("@")[0]
    : `gast-${Date.now()}`;

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
      companyName:
        data.customerCompany ||
        data.billingCompany ||
        data.deliveryCompany ||
        "Gastbestellung",
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
      return `- ${safeText(item.title)} | Menge: ${
        item.quantity || 1
      } | Summe: ${euroText(centsToEuro(item.totalPriceCents || 0))}`;
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
${data.costCenterName || "-"} ${
    data.costCenterCode ? "· " + data.costCenterCode : ""
  }

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
      return `- ${safeText(item.title)} | Menge: ${
        item.quantity || 1
      } | Summe: ${euroText(centsToEuro(item.totalPriceCents || 0))}`;
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

    const orderNumber = await makeOrderNumber();

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

        subtotalAmount: centsToEuro(data.subtotalAmountCents || data.cartSubtotalCents || 0),
        taxAmount: centsToEuro(data.taxAmountCents || 0),
        totalAmount: centsToEuro(data.cartTotalCents || data.totalAmountCents || 0),

        notes: [
          data.note || "",
          data.internalReference ? `Hinweis: ${data.internalReference}` : "",
          data.deliveryType ? `Lieferart: ${data.deliveryType}` : "",
          data.deliveryDate ? `Datum: ${data.deliveryDate}` : "",
          data.deliveryTime ? `Zeit: ${data.deliveryTime}` : "",
          data.eventTime ? `Eventbeginn: ${data.eventTime}` : "",
          data.invoiceAllowed ? "Rechnungskauf: Ja" : "Rechnungskauf: Nein",
          data.deliveryStreet || data.deliveryCity
            ? `Lieferadresse: ${data.deliveryCompany || ""}, ${
                data.deliveryStreet || ""
              }, ${data.deliveryZip || ""} ${data.deliveryCity || ""}, ${
                data.deliveryExtra || ""
              }`
            : "",
          data.billingStreet || data.billingCity
            ? `Rechnungsadresse: ${data.billingCompany || ""}, ${
                data.billingStreet || ""
              }, ${data.billingZip || ""} ${data.billingCity || ""}, ${
                data.billingExtra || ""
              }`
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
            unitPrice: centsToEuro(getItemUnitPriceCents(item)),
            totalPrice: centsToEuro(getItemTotalPriceCents(item)),
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

    const ownerEmail = String(
      process.env.ORDER_NOTIFICATION_EMAIL ||
        process.env.ORDER_MAIL_TO ||
        "info@letmebowl-catering.de"
    )
      .trim()
      .toLowerCase();

    const customerEmail = String(
      data.contactEmail ||
        data.customerEmail ||
        data.portalCustomerEmail ||
        ""
    )
      .trim()
      .toLowerCase();

    let internalMailSent = false;
    let customerMailSent = false;
    let internalMailError = null;
    let customerMailError = null;

    try {
      const internalResult = await sendMail({
        to: ownerEmail,
        subject: `Neue Bestellung ${order.orderNumber}: ${
          data.customerCompany ||
          data.portalCustomerCompany ||
          data.contactName ||
          data.customerName ||
          "Kunde"
        }`,
        text: buildOwnerEmailText(data, order.orderNumber),
        replyTo: customerEmail || undefined,
      });

      internalMailSent = true;

      console.log("INTERNE BESTELLMAIL VERSENDET:", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipient: ownerEmail,
        result: internalResult,
      });
    } catch (error) {
      internalMailError = String(error?.message || error);

      console.error("INTERNE BESTELLMAIL FEHLGESCHLAGEN:", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        recipient: ownerEmail,
        error: internalMailError,
        stack: error?.stack || null,
      });
    }

    if (customerEmail && customerEmail !== ownerEmail) {
      try {
        const customerResult = await sendMail({
          to: customerEmail,
          subject: `Deine Bestellung ${order.orderNumber} bei Let Me Bowl wurde erhalten`,
          text: buildCustomerEmailText(data, order.orderNumber),
        });

        customerMailSent = true;

        console.log("KUNDEN-BESTELLMAIL VERSENDET:", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          recipient: customerEmail,
          result: customerResult,
        });
      } catch (error) {
        customerMailError = String(error?.message || error);

        console.error("KUNDEN-BESTELLMAIL FEHLGESCHLAGEN:", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          recipient: customerEmail,
          error: customerMailError,
          stack: error?.stack || null,
        });
      }
    }

    return Response.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      email: {
        internalSent: internalMailSent,
        customerSent: customerMailSent,
        internalRecipient: ownerEmail,
        customerRecipient: customerEmail || null,
        internalError: internalMailError,
        customerError: customerMailError,
      },
    });
  } catch (error) {
    console.error("api.portal-order Fehler:", error);

    return Response.json(
      {
        ok: false,
        error: "Bestellung konnte nicht gespeichert werden.",
        detail: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}