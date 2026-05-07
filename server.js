import express from "express";
import { createRequestHandler } from "@react-router/express";

const app = express();
const PORT = process.env.PORT || 8080;

// ===== CORS für Shopify / Let Me Bowl Frontend =====
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://letmebowl-catering.de",
    "https://www.letmebowl-catering.de",
    "https://konto.letmebowl-catering.de",
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== HILFSFUNKTIONEN =====

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function euroFromCents(cents) {
  const value = Number(cents || 0) / 100;

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
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

function isTruthy(value) {
  return value === true || value === "true" || value === "Ja" || value === "1";
}

function getMailjetConfig() {
  const apiKey =
    process.env.MAILJET_API_KEY ||
    process.env.MJ_APIKEY_PUBLIC ||
    process.env.SMTP_USER;

  const secretKey =
    process.env.MAILJET_SECRET_KEY ||
    process.env.MJ_APIKEY_PRIVATE ||
    process.env.SMTP_PASS;

  const fromEmail =
    process.env.MAIL_FROM_EMAIL ||
    process.env.MAILJET_FROM_EMAIL ||
    "info@letmebowl-catering.de";

  const fromName =
    process.env.MAIL_FROM_NAME ||
    process.env.MAILJET_FROM_NAME ||
    "Let Me Bowl";

  const ownerEmail =
    process.env.ORDER_NOTIFICATION_EMAIL ||
    process.env.ORDER_MAIL_TO ||
    "info@letmebowl-catering.de";

  const bccEmail = process.env.MAIL_BCC || "";

  return {
    apiKey,
    secretKey,
    fromEmail,
    fromName,
    ownerEmail,
    bccEmail,
    configured: Boolean(apiKey && secretKey && fromEmail && ownerEmail),
  };
}

async function sendMailjetMessages(messages) {
  const config = getMailjetConfig();

  if (!config.configured) {
    console.warn("Mailjet ist nicht vollständig konfiguriert.");
    return {
      sent: false,
      reason: "Mailjet Variablen fehlen",
      config: {
        hasApiKey: Boolean(config.apiKey),
        hasSecretKey: Boolean(config.secretKey),
        fromEmail: config.fromEmail,
        ownerEmail: config.ownerEmail,
      },
    };
  }

  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString(
    "base64"
  );

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: messages,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Mailjet API Fehler:", result);

    return {
      sent: false,
      status: response.status,
      reason: result,
    };
  }

  return {
    sent: true,
    result,
  };
}

// ===== E-MAIL TEMPLATES =====

function buildOwnerEmailHtml(data) {
  const items = parseItems(data.items);

  const itemRows = items
    .map((item) => {
      const title = safeText(item.title) || "Artikel";
      const quantity = Number(item.quantity || 1);
      const total = euroFromCents(item.totalPriceCents || 0);
      const variantTitle = safeText(item.variantTitle);
      const sku = safeText(item.sku);

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(title)}</strong>
            ${
              variantTitle
                ? `<br><span style="color:#666;">${escapeHtml(variantTitle)}</span>`
                : ""
            }
            ${
              sku
                ? `<br><span style="color:#999;">SKU: ${escapeHtml(sku)}</span>`
                : ""
            }
          </td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${total}</td>
        </tr>
      `;
    })
    .join("");

  const deliveryType = safeText(data.deliveryType) || "-";
  const deliveryDate = safeText(data.deliveryDate) || "-";
  const deliveryTime = safeText(data.deliveryTime) || "-";
  const eventTime = safeText(data.eventTime) || "-";

  const contactName = safeText(data.contactName || data.customerName) || "-";
  const contactEmail = safeText(data.contactEmail || data.customerEmail) || "-";
  const contactPhone = safeText(data.contactPhone || data.customerPhone) || "-";

  const invoiceAllowed = isTruthy(data.invoiceAllowed || data.invoiceApproved);
  const customerIsLoggedIn = isTruthy(data.customerIsLoggedIn);

  const portalCustomerCompany = safeText(
    data.portalCustomerCompany || data.customerCompany
  );

  const portalDeliveryAddressLabel = safeText(data.portalDeliveryAddressLabel);
  const portalDeliveryAddressFull = safeText(data.portalDeliveryAddressFull);

  const portalCostCenterName = safeText(
    data.portalCostCenterName || data.costCenterName
  );
  const portalCostCenterCode = safeText(
    data.portalCostCenterCode || data.costCenterCode
  );

  const deliveryCompany = safeText(data.deliveryCompany || data.customerCompany);
  const deliveryStreet = safeText(data.deliveryStreet);
  const deliveryZip = safeText(data.deliveryZip);
  const deliveryCity = safeText(data.deliveryCity);
  const deliveryExtra = safeText(data.deliveryExtra);

  const billingCompany = safeText(data.billingCompany || data.customerCompany);
  const billingStreet = safeText(data.billingStreet);
  const billingZip = safeText(data.billingZip);
  const billingCity = safeText(data.billingCity);
  const billingExtra = safeText(data.billingExtra);

  const internalReference = safeText(data.internalReference);
  const note = safeText(data.note);

  const total = euroFromCents(
    data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0
  );

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f2ec;font-family:Arial,sans-serif;color:#1f2430;">
    <div style="max-width:780px;margin:0 auto;padding:28px;">
      <div style="background:#fff;border-radius:22px;padding:28px;border:1px solid #e7dfd2;">
        <h1 style="margin:0 0 8px;font-size:28px;">Neue Let Me Bowl Bestellung</h1>
        <p style="margin:0 0 24px;color:#666;">Eine neue Firmenbestellung wurde über Website / Firmenkonto übermittelt.</p>

        <div style="background:#f8f3e8;border-radius:16px;padding:18px;margin-bottom:22px;">
          <h2 style="margin:0 0 12px;font-size:18px;">Bestellübersicht</h2>
          <p style="margin:4px 0;"><strong>Lieferart:</strong> ${escapeHtml(deliveryType)}</p>
          <p style="margin:4px 0;"><strong>Datum:</strong> ${escapeHtml(deliveryDate)}</p>
          <p style="margin:4px 0;"><strong>Zeit:</strong> ${escapeHtml(deliveryTime)}</p>
          <p style="margin:4px 0;"><strong>Eventbeginn:</strong> ${escapeHtml(eventTime)}</p>
          <p style="margin:4px 0;"><strong>Gesamt:</strong> ${escapeHtml(total)}</p>
        </div>

        <h2 style="font-size:18px;margin:0 0 12px;">Kundendaten</h2>
        <p style="margin:4px 0;"><strong>Firma:</strong> ${escapeHtml(portalCustomerCompany || deliveryCompany || billingCompany || "-")}</p>
        <p style="margin:4px 0;"><strong>Name:</strong> ${escapeHtml(contactName)}</p>
        <p style="margin:4px 0;"><strong>E-Mail:</strong> ${escapeHtml(contactEmail)}</p>
        <p style="margin:4px 0;"><strong>Telefon:</strong> ${escapeHtml(contactPhone)}</p>
        <p style="margin:4px 0;"><strong>Firmenkonto erkannt:</strong> ${customerIsLoggedIn ? "Ja" : "Nein"}</p>
        <p style="margin:4px 0 22px;"><strong>Rechnungskauf freigegeben:</strong> ${invoiceAllowed ? "Ja" : "Nein"}</p>

        ${
          portalDeliveryAddressLabel || portalCostCenterName
            ? `
              <div style="background:#eef8ef;border-radius:16px;padding:18px;margin-bottom:22px;border:1px solid #cfe8d4;">
                <h2 style="font-size:18px;margin:0 0 12px;">Firmenkonto / Portal</h2>
                ${
                  portalDeliveryAddressLabel
                    ? `<p style="margin:4px 0;"><strong>Lieferadresse:</strong> ${escapeHtml(portalDeliveryAddressLabel)}</p>`
                    : ""
                }
                ${
                  portalDeliveryAddressFull
                    ? `<p style="margin:4px 0;"><strong>Adresse voll:</strong> ${escapeHtml(portalDeliveryAddressFull)}</p>`
                    : ""
                }
                ${
                  portalCostCenterName
                    ? `<p style="margin:4px 0;"><strong>Kostenstelle:</strong> ${escapeHtml(portalCostCenterName)} ${
                        portalCostCenterCode ? "· " + escapeHtml(portalCostCenterCode) : ""
                      }</p>`
                    : ""
                }
              </div>
            `
            : ""
        }

        <h2 style="font-size:18px;margin:0 0 12px;">Artikel</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr>
              <th style="padding:12px;border-bottom:2px solid #ddd;text-align:left;">Artikel</th>
              <th style="padding:12px;border-bottom:2px solid #ddd;text-align:center;">Menge</th>
              <th style="padding:12px;border-bottom:2px solid #ddd;text-align:right;">Summe</th>
            </tr>
          </thead>
          <tbody>
            ${
              itemRows ||
              `<tr><td colspan="3" style="padding:12px;color:#888;">Keine Artikeldaten übertragen.</td></tr>`
            }
          </tbody>
        </table>

        <h2 style="font-size:18px;margin:0 0 12px;">Lieferadresse</h2>
        ${
          deliveryType.toLowerCase().includes("abhol")
            ? `<p style="margin:4px 0 22px;">Abholung im Geschäft</p>`
            : `
              <p style="margin:4px 0;"><strong>Firma:</strong> ${escapeHtml(deliveryCompany || "-")}</p>
              <p style="margin:4px 0;"><strong>Straße:</strong> ${escapeHtml(deliveryStreet || "-")}</p>
              <p style="margin:4px 0;"><strong>PLZ / Ort:</strong> ${escapeHtml(`${deliveryZip || "-"} ${deliveryCity || ""}`)}</p>
              <p style="margin:4px 0 22px;"><strong>Zusatz:</strong> ${escapeHtml(deliveryExtra || "-")}</p>
            `
        }

        <h2 style="font-size:18px;margin:0 0 12px;">Rechnungsadresse</h2>
        <p style="margin:4px 0;"><strong>Firma:</strong> ${escapeHtml(billingCompany || "-")}</p>
        <p style="margin:4px 0;"><strong>Straße:</strong> ${escapeHtml(billingStreet || "-")}</p>
        <p style="margin:4px 0;"><strong>PLZ / Ort:</strong> ${escapeHtml(`${billingZip || "-"} ${billingCity || ""}`)}</p>
        <p style="margin:4px 0 22px;"><strong>Zusatz:</strong> ${escapeHtml(billingExtra || "-")}</p>

        <h2 style="font-size:18px;margin:0 0 12px;">Hinweise / interne Referenz</h2>
        <p style="white-space:pre-line;background:#fafafa;border:1px solid #eee;border-radius:14px;padding:14px;margin:0 0 18px;">
          ${escapeHtml(internalReference || "-")}
        </p>

        ${
          note
            ? `
              <h2 style="font-size:18px;margin:0 0 12px;">Technische Bestellnotiz</h2>
              <p style="white-space:pre-line;background:#fafafa;border:1px solid #eee;border-radius:14px;padding:14px;margin:0;">
                ${escapeHtml(note)}
              </p>
            `
            : ""
        }
      </div>
    </div>
  </body>
</html>
  `;
}

function buildOwnerEmailText(data) {
  const items = parseItems(data.items);

  const itemText = items
    .map((item) => {
      return `- ${safeText(item.title)} | Menge: ${
        item.quantity || 1
      } | Summe: ${euroFromCents(item.totalPriceCents || 0)}`;
    })
    .join("\n");

  return `
Neue Let Me Bowl Bestellung

Lieferart: ${safeText(data.deliveryType)}
Datum: ${safeText(data.deliveryDate)}
Zeit: ${safeText(data.deliveryTime)}
Eventbeginn: ${safeText(data.eventTime)}

Kunde:
Firma: ${safeText(data.portalCustomerCompany || data.customerCompany || data.deliveryCompany || data.billingCompany)}
Name: ${safeText(data.contactName || data.customerName)}
E-Mail: ${safeText(data.contactEmail || data.customerEmail)}
Telefon: ${safeText(data.contactPhone || data.customerPhone)}

Firmenkonto erkannt: ${isTruthy(data.customerIsLoggedIn) ? "Ja" : "Nein"}
Rechnungskauf freigegeben: ${isTruthy(data.invoiceAllowed || data.invoiceApproved) ? "Ja" : "Nein"}

Portal:
Lieferadresse: ${safeText(data.portalDeliveryAddressLabel)}
Kostenstelle: ${safeText(data.portalCostCenterName || data.costCenterName)} ${safeText(data.portalCostCenterCode || data.costCenterCode)}

Artikel:
${itemText || "Keine Artikeldaten übertragen."}

Gesamt: ${euroFromCents(
    data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0
  )}

Lieferadresse:
Firma: ${safeText(data.deliveryCompany || data.customerCompany)}
Straße: ${safeText(data.deliveryStreet)}
PLZ/Ort: ${safeText(data.deliveryZip)} ${safeText(data.deliveryCity)}
Zusatz: ${safeText(data.deliveryExtra)}

Rechnungsadresse:
Firma: ${safeText(data.billingCompany || data.customerCompany)}
Straße: ${safeText(data.billingStreet)}
PLZ/Ort: ${safeText(data.billingZip)} ${safeText(data.billingCity)}
Zusatz: ${safeText(data.billingExtra)}

Hinweise:
${safeText(data.internalReference)}

Bestellnotiz:
${safeText(data.note)}
  `.trim();
}

function buildCustomerEmailHtml(data) {
  const items = parseItems(data.items);

  const itemRows = items
    .map((item) => {
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${escapeHtml(safeText(item.title) || "-")}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity || 1}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${euroFromCents(item.totalPriceCents || 0)}</td>
        </tr>
      `;
    })
    .join("");

  const total = euroFromCents(
    data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0
  );

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f2ec;font-family:Arial,sans-serif;color:#1f2430;">
    <div style="max-width:720px;margin:0 auto;padding:28px;">
      <div style="background:#fff;border-radius:22px;padding:28px;border:1px solid #e7dfd2;">
        <h1 style="margin:0 0 10px;font-size:28px;">Vielen Dank für deine Bestellung.</h1>
        <p style="margin:0 0 22px;color:#555;line-height:1.6;">
          Wir haben deine Firmenbestellung erhalten und prüfen die Angaben.
        </p>

        <div style="background:#f8f3e8;border-radius:16px;padding:18px;margin-bottom:22px;">
          <p style="margin:4px 0;"><strong>Firma:</strong> ${escapeHtml(safeText(data.portalCustomerCompany || data.customerCompany || data.billingCompany || data.deliveryCompany) || "-")}</p>
          <p style="margin:4px 0;"><strong>Kontakt:</strong> ${escapeHtml(safeText(data.contactName || data.customerName) || "-")}</p>
          <p style="margin:4px 0;"><strong>Lieferart:</strong> ${escapeHtml(safeText(data.deliveryType) || "-")}</p>
          <p style="margin:4px 0;"><strong>Datum:</strong> ${escapeHtml(safeText(data.deliveryDate) || "-")}</p>
          <p style="margin:4px 0;"><strong>Zeit:</strong> ${escapeHtml(safeText(data.deliveryTime) || "-")}</p>
          <p style="margin:4px 0;"><strong>Eventbeginn:</strong> ${escapeHtml(safeText(data.eventTime) || "-")}</p>
        </div>

        <h2 style="font-size:18px;margin:0 0 12px;">Artikel</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          <tbody>
            ${
              itemRows ||
              `<tr><td style="padding:10px;color:#888;">Keine Artikeldaten übertragen.</td></tr>`
            }
          </tbody>
        </table>

        <p style="font-size:18px;margin:0 0 22px;">
          <strong>Gesamt:</strong> ${escapeHtml(total)}
        </p>

        <p style="margin:0;color:#555;line-height:1.6;">
          Die Rechnung folgt separat nach dem vereinbarten Abrechnungsprozess.
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

function buildCustomerEmailText(data) {
  const items = parseItems(data.items);

  const itemText = items
    .map((item) => {
      return `- ${safeText(item.title)} | Menge: ${
        item.quantity || 1
      } | Summe: ${euroFromCents(item.totalPriceCents || 0)}`;
    })
    .join("\n");

  return `
Vielen Dank für deine Bestellung.

Wir haben deine Firmenbestellung erhalten und prüfen die Angaben.

Firma: ${safeText(data.portalCustomerCompany || data.customerCompany || data.billingCompany || data.deliveryCompany)}
Kontakt: ${safeText(data.contactName || data.customerName)}
Lieferart: ${safeText(data.deliveryType)}
Datum: ${safeText(data.deliveryDate)}
Zeit: ${safeText(data.deliveryTime)}
Eventbeginn: ${safeText(data.eventTime)}

Artikel:
${itemText || "Keine Artikeldaten übertragen."}

Gesamt: ${euroFromCents(
    data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0
  )}

Die Rechnung folgt separat.
  `.trim();
}

async function sendOrderEmails(data) {
  const config = getMailjetConfig();

  const customerEmail = safeText(data.contactEmail || data.customerEmail);
  const contactName = safeText(data.contactName || data.customerName) || "Kunde";
  const deliveryDate = safeText(data.deliveryDate) || "ohne Datum";

  const ownerSubject = `Neue Bestellung: ${contactName} – ${deliveryDate}`;
  const customerSubject = "Deine Bestellung bei Let Me Bowl wurde erhalten";

  const messages = [];

  const ownerMessage = {
    From: {
      Email: config.fromEmail,
      Name: config.fromName,
    },
    To: [
      {
        Email: config.ownerEmail,
        Name: "Let Me Bowl",
      },
    ],
    Subject: ownerSubject,
    TextPart: buildOwnerEmailText(data),
    HTMLPart: buildOwnerEmailHtml(data),
  };

  if (customerEmail) {
    ownerMessage.ReplyTo = {
      Email: customerEmail,
      Name: contactName,
    };
  }

  if (config.bccEmail) {
    ownerMessage.Bcc = [
      {
        Email: config.bccEmail,
        Name: "Let Me Bowl BCC",
      },
    ];
  }

  messages.push(ownerMessage);

  if (customerEmail) {
    messages.push({
      From: {
        Email: config.fromEmail,
        Name: config.fromName,
      },
      To: [
        {
          Email: customerEmail,
          Name: contactName,
        },
      ],
      Subject: customerSubject,
      TextPart: buildCustomerEmailText(data),
      HTMLPart: buildCustomerEmailHtml(data),
    });
  }

  return await sendMailjetMessages(messages);
}

// ===== API: Portal-Bestellung speichern / E-Mail senden =====

app.post("/api/portal-order", async (req, res) => {
  try {
    const data = req.body || {};

    const normalizedData = {
      ...data,

      customerEmail: data.customerEmail || data.portalCustomerEmail || data.contactEmail || "",
      customerName: data.customerName || data.portalCustomerName || data.contactName || "",
      customerCompany:
        data.customerCompany ||
        data.portalCustomerCompany ||
        data.deliveryCompany ||
        data.billingCompany ||
        "",

      contactEmail: data.contactEmail || data.customerEmail || data.portalCustomerEmail || "",
      contactName: data.contactName || data.customerName || data.portalCustomerName || "",
      contactPhone: data.contactPhone || data.customerPhone || "",

      deliveryCompany:
        data.deliveryCompany ||
        data.customerCompany ||
        data.portalCustomerCompany ||
        "",

      billingCompany:
        data.billingCompany ||
        data.customerCompany ||
        data.portalCustomerCompany ||
        "",

      totalAmountCents:
        data.totalAmountCents ||
        data.cartTotalCents ||
        data.subtotalAmountCents ||
        0,

      items: Array.isArray(data.items) ? JSON.stringify(data.items) : data.items,
    };

    console.log("Neue Portal-Bestellung empfangen:", {
      contactName: normalizedData.contactName,
      contactEmail: normalizedData.contactEmail,
      deliveryType: normalizedData.deliveryType,
      deliveryDate: normalizedData.deliveryDate,
      deliveryTime: normalizedData.deliveryTime,
      totalAmountCents: normalizedData.totalAmountCents,
    });

    const emailResult = await sendOrderEmails(normalizedData);

    console.log("Bestell-E-Mail Ergebnis:", {
      sent: emailResult.sent,
      status: emailResult.status || null,
    });

    return res.json({
      ok: true,
      email: emailResult,
    });
  } catch (error) {
    console.error("Portal Order Fehler:", error);

    return res.status(500).json({
      ok: false,
      error: "Bestellung konnte nicht verarbeitet werden.",
      detail: String(error?.message || error),
    });
  }
});

// Optional: falls die Danke-Seite diese Route noch aufruft
app.post("/api/portal-order-email", async (req, res) => {
  try {
    const data = req.body || {};

    const normalizedData = {
      ...data,

      customerEmail: data.customerEmail || data.portalCustomerEmail || data.contactEmail || "",
      customerName: data.customerName || data.portalCustomerName || data.contactName || "",
      customerCompany:
        data.customerCompany ||
        data.portalCustomerCompany ||
        data.deliveryCompany ||
        data.billingCompany ||
        "",

      contactEmail: data.contactEmail || data.customerEmail || data.portalCustomerEmail || "",
      contactName: data.contactName || data.customerName || data.portalCustomerName || "",
      contactPhone: data.contactPhone || data.customerPhone || "",

      deliveryCompany:
        data.deliveryCompany ||
        data.customerCompany ||
        data.portalCustomerCompany ||
        "",

      billingCompany:
        data.billingCompany ||
        data.customerCompany ||
        data.portalCustomerCompany ||
        "",

      totalAmountCents:
        data.totalAmountCents ||
        data.cartTotalCents ||
        data.subtotalAmountCents ||
        0,

      items: Array.isArray(data.items) ? JSON.stringify(data.items) : data.items,
    };

    console.log("Portal Order E-Mail Request empfangen:", {
      contactName: normalizedData.contactName,
      contactEmail: normalizedData.contactEmail,
      deliveryType: normalizedData.deliveryType,
      deliveryDate: normalizedData.deliveryDate,
      deliveryTime: normalizedData.deliveryTime,
      totalAmountCents: normalizedData.totalAmountCents,
    });

    const emailResult = await sendOrderEmails(normalizedData);

    console.log("Bestell-E-Mail Ergebnis:", {
      sent: emailResult.sent,
      status: emailResult.status || null,
    });

    return res.json({
      ok: true,
      email: emailResult,
    });
  } catch (error) {
    console.error("portal-order-email error:", error);

    return res.status(500).json({
      ok: false,
      error: "E-Mail konnte nicht gesendet werden.",
      detail: String(error?.message || error),
    });
  }
});

// ===== Health Check =====

app.get("/api/health", (req, res) => {
  const config = getMailjetConfig();

  res.json({
    ok: true,
    mailProvider: "mailjet-api",
    mailConfigured: config.configured,
    fromEmail: config.fromEmail,
    ownerEmail: config.ownerEmail,
    hasApiKey: Boolean(config.apiKey),
    hasSecretKey: Boolean(config.secretKey),
  });
});

// ===== Passwort vergessen =====

app.post("/api/password-forgot", async (req, res) => {
  try {
    const email = safeText(req.body?.email).toLowerCase();

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-Mail fehlt",
      });
    }

    const resetLink = `${process.env.APP_URL}/passwort-zuruecksetzen?email=${encodeURIComponent(
      email
    )}`;

    const config = getMailjetConfig();

    const emailResult = await sendMailjetMessages([
      {
        From: {
          Email: config.fromEmail,
          Name: config.fromName,
        },
        To: [
          {
            Email: email,
            Name: email,
          },
        ],
        Subject: "Passwort zurücksetzen",
        TextPart: `Passwort zurücksetzen\n\nFür diese E-Mail wurde ein Passwort-Reset angefragt:\n${email}\n\n${resetLink}`,
        HTMLPart: `
          <h2>Passwort zurücksetzen</h2>
          <p>Für diese E-Mail wurde ein Passwort-Reset angefragt:</p>
          <p><strong>${escapeHtml(email)}</strong></p>
          <p>Klicke auf den Link:</p>
          <a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a>
        `,
      },
    ]);

    if (!emailResult.sent) {
      return res.status(500).json({
        ok: false,
        message: "E-Mail konnte nicht gesendet werden.",
        email: emailResult,
      });
    }

    return res.json({
      ok: true,
      message: "E-Mail wurde gesendet",
      email: emailResult,
    });
  } catch (error) {
    console.error("Password forgot error:", error);

    return res.status(500).json({
      ok: false,
      message: "Fehler beim Senden der E-Mail",
      detail: String(error?.message || error),
    });
  }
});

// ===== React Router erst NACH allen API-Routen =====

const build = await import("./build/server/index.js");

// Hochgeladene PDFs öffentlich machen
app.use("/uploads", express.static("uploads"));

// Statische React-App
app.use(express.static("build/client"));

// Catch-all für React Router
app.all("*", createRequestHandler({ build }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT} - Mailjet API aktiv`);
});