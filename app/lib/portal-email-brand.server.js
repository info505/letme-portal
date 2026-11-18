/**
 * Transactional mail transport for the existing customer portal.
 * The provider switch is explicit: MAIL_PROVIDER=brevo + BREVO_API_KEY.
 * No database, customer account or recipient state is changed here.
 */
const LOGO_URL = "https://konto.letmebowl-catering.de/brand/let-me-bowl-logo.webp";
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function brandPortalEmail(html, title = "Let Me Bowl") {
  const source = String(html || "");
  if (source.includes('data-lmb-mail="central-v1"')) return source;
  // Old templates sometimes supply complete HTML documents.
  // Keep their existing order and billing details, but replace the outer layout.
  const inner = source
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?(?:html|body)\b[^>]*>/gi, "")
    .replace(/#c8a96a|#b8934f|#a97d2f/gi, "#234c30")
    .replace(/#f5f2ec|#efebe2/gi, "#f9f7f3");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body data-lmb-mail="central-v1" style="margin:0;padding:0;background:#f9f7f3;color:#17281d;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f9f7f3"><tr><td align="center" style="padding:26px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;background:#fff;border:1px solid #e7e5df;border-radius:18px;overflow:hidden;">
<tr><td align="center" style="padding:22px;background:#e9ecdc;border-bottom:1px solid #e7e5df;">
<img src="${LOGO_URL}" width="108" height="89" alt="Let Me Bowl" style="display:block;width:108px;height:89px;object-fit:contain;border:0;" />
<div style="color:#607e36;font-size:11px;font-weight:bold;letter-spacing:1.6px;padding-top:8px;">LET ME BOWL · CATERING BERLIN</div></td></tr>
<tr><td style="padding:28px 24px;color:#17281d;font-size:15px;line-height:1.6;">${inner}</td></tr>
<tr><td style="padding:18px 24px;border-top:1px solid #e7e5df;color:#727a73;font-size:13px;line-height:1.6;">Fragen? <a href="mailto:info@letmebowl-catering.de" style="color:#234c30;">info@letmebowl-catering.de</a> · 030 469 962 95</td></tr>
</table><p style="max-width:680px;color:#727a73;font-size:12px;line-height:1.65;margin:18px auto;">Edis Gastrobetriebe GmbH &amp; Co. KG · Goerzallee 299 · 14167 Berlin<br /><a href="https://letmebowl-catering.de" style="color:#234c30;">letmebowl-catering.de</a></p></td></tr></table></body></html>`;
}

function normalizedAddresses(input) {
  const list = Array.isArray(input) ? input : input ? [input] : [];
  return list.map(item => typeof item === "string" ? { email: item.trim() } : {
    email: String(item?.Email || item?.email || "").trim(),
    ...(item?.Name || item?.name ? { name: String(item.Name || item.name) } : {}),
  }).filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email));
}

/** Throws on incomplete configuration or provider failure; never silently retries. */
export async function sendBrevoPortalMessage({ to, cc, bcc, subject, html, text, replyTo, fromEmail, fromName }) {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  if (!apiKey) throw new Error("BREVO_API_KEY fehlt; Nachricht wurde nicht versendet.");
  const recipients = normalizedAddresses(to);
  if (!recipients.length) throw new Error("Kein gültiger E-Mail-Empfänger.");
  const senderEmail = String(fromEmail || process.env.MAIL_FROM_EMAIL || "info@letmebowl-catering.de").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) throw new Error("Ungültige Absenderadresse.");
  const ccRecipients = normalizedAddresses(cc), bccRecipients = normalizedAddresses(bcc);
  const replyRecipients = normalizedAddresses(replyTo);
  const body = {
    sender: { email: senderEmail, name: String(fromName || process.env.MAIL_FROM_NAME || "Let Me Bowl") },
    to: recipients,
    subject: String(subject || "").trim(),
    htmlContent: brandPortalEmail(html || esc(text), subject),
    ...(ccRecipients.length ? { cc: ccRecipients } : {}),
    ...(bccRecipients.length ? { bcc: bccRecipients } : {}),
    ...(replyRecipients.length ? { replyTo: replyRecipients[0] } : {}),
    tags: ["let-me-bowl", "kundenportal"],
  };
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: { "api-key": apiKey, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Brevo Versandfehler (HTTP " + response.status + "). Bitte Versandstatus prüfen, bevor erneut gesendet wird.");
  if (!result?.messageId) throw new Error("Brevo hat keine eindeutige Versandbestätigung geliefert. Bitte vor erneutem Versand prüfen.");
  return result;
}

export function mailjetToBrevo(message) {
  return {
    to: message.To,
    cc: message.Cc,
    bcc: message.Bcc,
    replyTo: message.ReplyTo,
    subject: message.Subject,
    html: message.HTMLPart,
    text: message.TextPart,
    fromEmail: message.From?.Email,
    fromName: message.From?.Name,
  };
}
