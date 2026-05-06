import express from "express";
import { createRequestHandler } from "@react-router/express";
import nodemailer from "nodemailer";

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

// ===== MAILJET / SMTP =====

function createMailTransporter() {
  const host = process.env.SMTP_HOST || "in-v3.mailjet.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("SMTP_USER oder SMTP_PASS fehlt. E-Mail-Versand nicht möglich.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

const transporter = createMailTransporter();

// ===== HILFSFUNKTIONEN =====

function euroFromCents(cents) {
  const value = Number(cents || 0) / 100;

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

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

function buildOrderEmailHtml(data) {
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

  const portalDeliveryAddressLabel = safeText(data.portalDeliveryAddressLabel);
  const portalDeliveryAddressFull = safeText(data.portalDeliveryAddressFull);

  const portalCostCenterName = safeText(data.portalCostCenterName || data.costCenterName);
  const portalCostCenterCode = safeText(data.portalCostCenterCode || data.costCenterCode);

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
  const total = euroFromCents(
    data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0
  );

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f2ec;font-family:Arial,sans-serif;color:#1f2430;">
    <div style="max-width:760px;margin:0 auto;padding:28px;">
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
              `
              <tr>
                <td colspan="3" style="padding:12px;color:#888;">Keine Artikeldaten übertragen.</td>
              </tr>
              `
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
        <p style="white-space:pre-line;background:#fafafa;border:1px solid #eee;border-radius:14px;padding:14px;margin:0;">
          ${escapeHtml(internalReference || "-")}
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

function buildOrderEmailText(data) {
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
Name: ${safeText(data.contactName || data.customerName)}
E-Mail: ${safeText(data.contactEmail || data.customerEmail)}
Telefon: ${safeText(data.contactPhone || data.customerPhone)}

Firmenkonto erkannt: ${isTruthy(data.customerIsLoggedIn) ? "Ja" : "Nein"}
Rechnungskauf freigegeben: ${isTruthy(data.invoiceAllowed || data.invoiceApproved) ? "Ja" : "Nein"}

Portal:
Lieferadresse: ${safeText(data.portalDeliveryAddressLabel)}
Kostenstelle: ${safeText(data.portalCostCenterName || data.costCenterName)} ${safeText(
    data.portalCostCenterCode || data.costCenterCode
  )}

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
  `.trim();
}

function buildCustomerConfirmationHtml(data) {
  const items = parseItems(data.items);

  const itemRows = items
    .map((item) => {
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${escapeHtml(
            safeText(item.title) || "-"
          )}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${
            item.quantity || 1
          }</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${euroFromCents(
            item.totalPriceCents || 0
          )}</td>
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
          <p style="margin:4px 0;"><strong>Firma:</strong> ${escapeHtml(
            safeText(data.customerCompany || data.billingCompany || data.deliveryCompany) || "-"
          )}</p>
          <p style="margin:4px 0;"><strong>Kontakt:</strong> ${escapeHtml(
            safeText(data.contactName || data.customerName) || "-"
          )}</p>
          <p style="margin:4px 0;"><strong>Lieferart:</strong> ${escapeHtml(
            safeText(data.deliveryType) || "-"
          )}</p>
          <p style="margin:4px 0;"><strong>Datum:</strong> ${escapeHtml(
            safeText(data.deliveryDate) || "-"
          )}</p>
          <p style="margin:4px 0;"><strong>Zeit:</strong> ${escapeHtml(
            safeText(data.deliveryTime) || "-"
          )}</p>
          <p style="margin:4px 0;"><strong>Eventbeginn:</strong> ${escapeHtml(
            safeText(data.eventTime) || "-"
          )}</p>
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

function buildCustomerConfirmationText(data) {
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

Firma: ${safeText(data.customerCompany || data.billingCompany || data.deliveryCompany)}
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

async function sendOrderNotificationEmail(data) {
  if (!transporter) {
    return {
      sent: false,
      reason: "SMTP nicht konfiguriert",
    };
  }

  const ownerTo =
    process.env.ORDER_NOTIFICATION_EMAIL ||
    process.env.ORDER_MAIL_TO ||
    "info@letmebowl-catering.de";

  const bcc = process.env.MAIL_BCC || undefined;

  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    "Let Me Bowl <info@letmebowl-catering.de>";

  const contactEmail = safeText(data.contactEmail || data.customerEmail);
  const contactName = safeText(data.contactName || data.customerName) || "Kunde";
  const deliveryDate = safeText(data.deliveryDate) || "ohne Datum";

  const ownerSubject = `Neue Bestellung: ${contactName} – ${deliveryDate}`;
  const customerSubject = "Deine Bestellung bei Let Me Bowl wurde erhalten";

  const ownerMail = await transporter.sendMail({
    from,
    to: ownerTo,
    bcc,
    subject: ownerSubject,
    html: buildOrderEmailHtml(data),
    text: buildOrderEmailText(data),
    replyTo: contactEmail || undefined,
  });

  let customerMail = null;

  if (contactEmail) {
    customerMail = await transporter.sendMail({
      from,
      to: contactEmail,
      subject: customerSubject,
      html: buildCustomerConfirmationHtml(data),
      text: buildCustomerConfirmationText(data),
    });
  }

  return {
    sent: true,
    ownerMail,
    customerMail,
  };
}

// ===== API: Portal-Bestellung speichern / E-Mail senden =====

app.post("/api/portal-order", async (req, res) => {
  try {
    const data = req.body || {};

    const normalizedData = {
      ...data,
      contactEmail: data.contactEmail || data.customerEmail || "",
      contactName: data.contactName || data.customerName || "",
      contactPhone: data.contactPhone || data.customerPhone || "",
      deliveryCompany: data.deliveryCompany || data.customerCompany || "",
      billingCompany: data.billingCompany || data.customerCompany || "",
      totalAmountCents:
        data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0,
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

    const emailResult = await sendOrderNotificationEmail(normalizedData);

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

// Optional bleibt drin, falls irgendwo noch die Danke-Seite diese Route aufruft.
// Später können wir es entfernen.
app.post("/api/portal-order-email", async (req, res) => {
  try {
    const data = req.body || {};

    const normalizedData = {
      ...data,
      contactEmail: data.contactEmail || data.customerEmail || "",
      contactName: data.contactName || data.customerName || "",
      contactPhone: data.contactPhone || data.customerPhone || "",
      deliveryCompany: data.deliveryCompany || data.customerCompany || "",
      billingCompany: data.billingCompany || data.customerCompany || "",
      totalAmountCents:
        data.totalAmountCents || data.cartTotalCents || data.subtotalAmountCents || 0,
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

    const emailResult = await sendOrderNotificationEmail(normalizedData);

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
  res.json({
    ok: true,
    mailConfigured: Boolean(transporter),
  });
});

// ===== Passwort vergessen =====

app.post("/api/password-forgot", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "E-Mail fehlt",
      });
    }

    if (!transporter) {
      return res.status(500).json({
        ok: false,
        message: "SMTP ist nicht konfiguriert.",
      });
    }

    const resetLink = `${process.env.APP_URL}/passwort-zuruecksetzen?email=${encodeURIComponent(
      email
    )}`;

    await transporter.sendMail({
      from:
        process.env.MAIL_FROM ||
        process.env.SMTP_FROM ||
        "Let Me Bowl <info@letmebowl-catering.de>",
      to: email,
      bcc: process.env.MAIL_BCC || undefined,
      subject: "Passwort zurücksetzen",
      html: `
        <h2>Passwort zurücksetzen</h2>
        <p>Für diese E-Mail wurde ein Passwort-Reset angefragt:</p>
        <p><strong>${escapeHtml(email)}</strong></p>
        <p>Klicke auf den Link:</p>
        <a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a>
      `,
      text: `Passwort zurücksetzen\n\nFür diese E-Mail wurde ein Passwort-Reset angefragt:\n${email}\n\n${resetLink}`,
    });

    return res.json({
      ok: true,
      message: "E-Mail wurde gesendet",
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
  console.log(`Server läuft auf Port ${PORT} - Mailjet SMTP aktiv`);
});