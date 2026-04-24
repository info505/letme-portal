import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "./prisma.server.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function createPasswordResetToken(userId) {
  const rawToken = createRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { rawToken, expiresAt };
}

export async function findValidPasswordResetToken(rawToken) {
  const tokenHash = sha256(rawToken);

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function markPasswordResetTokenUsed(id) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function invalidateAllUserResetTokens(userId) {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

function buildResetEmail({ resetUrl, isEn }) {
  const safeUrl = escapeHtml(resetUrl);

  const title = isEn ? "Reset your password" : "Passwort zurücksetzen";
  const intro = isEn
    ? "We received a request to reset the password for your Let Me Bowl account."
    : "Wir haben eine Anfrage erhalten, das Passwort für dein Let Me Bowl Konto zurückzusetzen.";
  const buttonText = isEn ? "Set new password" : "Neues Passwort setzen";
  const validText = isEn
    ? "This link is valid for 1 hour."
    : "Dieser Link ist 1 Stunde gültig.";
  const ignoreText = isEn
    ? "If you did not request this, you can safely ignore this email."
    : "Falls du das nicht angefordert hast, kannst du diese E-Mail einfach ignorieren.";
  const copyText = isEn
    ? "If the button does not work, copy this link into your browser:"
    : "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:";

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ee;padding:32px 14px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfcb;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px;background:#111111;color:#ffffff;">
                <div style="font-size:15px;font-weight:800;letter-spacing:0.12em;">LET ME BOWL</div>
                <div style="margin-top:8px;font-size:13px;color:#d9c391;">CATERING PORTAL</div>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 30px 10px;">
                <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#111111;">${title}</h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#4f4a43;">${intro}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 30px 12px;">
                <a href="${safeUrl}" style="display:inline-block;background:#c8a96a;color:#111111;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:14px;">
                  ${buttonText}
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 26px;">
                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#6b6258;">${copyText}</p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;color:#111111;background:#f7f4ee;border:1px solid #eadfcb;border-radius:14px;padding:12px;">
                  ${safeUrl}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 30px 32px;">
                <div style="border-top:1px solid #eadfcb;padding-top:18px;">
                  <p style="margin:0 0 8px;font-size:14px;color:#6b6258;">${validText}</p>
                  <p style="margin:0;font-size:14px;color:#6b6258;">${ignoreText}</p>
                </div>
              </td>
            </tr>
          </table>

          <p style="max-width:620px;margin:18px auto 0;font-size:12px;line-height:1.5;color:#8b8176;text-align:center;">
            Let Me Bowl Catering · Berlin
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordResetEmail({ user, locale, rawToken }) {
  const origin = process.env.APP_URL || "https://konto.letmebowl-catering.de";
  const resetUrl = `${origin}/passwort-zuruecksetzen?token=${encodeURIComponent(rawToken)}&lang=${locale}`;
  const isEn = locale === "en";

  const subject = isEn
    ? "Reset your Let Me Bowl password"
    : "Setze dein Let Me Bowl Passwort zurück";

  const result = await resend.emails.send({
    from: process.env.MAIL_FROM || "Let Me Bowl Catering <onboarding@resend.dev>",
    to: user.email,
    bcc: process.env.MAIL_BCC || undefined,
    subject,
    html: buildResetEmail({ resetUrl, isEn }),
  });

  if (result?.error) {
    throw new Error(result.error.message || "Resend mail error");
  }

  return result;
}