import crypto from "crypto";
import { sendMail } from "./mail.server.js";
import { prisma } from "./prisma.server.js";
import { renderBrandedEmail, emailTextParagraphs, brandedEmailText, safeEmailUrl } from "./email-layout.server.js";


function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createRawToken() {
  return crypto.randomBytes(32).toString("hex");
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

export function buildResetEmail({ resetUrl, isEn }) {
  const locale = isEn ? "en" : "de";
  const title = isEn ? "Reset your password" : "Passwort zurücksetzen";
  const text = isEn
    ? "We received a request to reset the password for your Let Me Bowl account.\n\nThis link is valid for one hour. If you did not request this, you can ignore this email."
    : "Wir haben eine Anfrage erhalten, das Passwort für Ihr Let Me Bowl Kundenkonto zurückzusetzen.\n\nDieser Link ist eine Stunde gültig. Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.";
  return renderBrandedEmail({ title, locale, preheader: isEn ? "Set a new password for your customer account." : "Legen Sie ein neues Passwort für Ihr Kundenkonto fest.",
    bodyHtml: emailTextParagraphs(text), action: { url: safeEmailUrl(resetUrl), label: isEn ? "Set new password" : "Neues Passwort setzen" } });
}

export async function sendPasswordResetEmail({ user, locale, rawToken }) {
  const origin =
    process.env.APP_URL ||
    "https://konto.letmebowl-catering.de";

  const resetUrl =
    `${origin}/passwort-zuruecksetzen` +
    `?token=${encodeURIComponent(rawToken)}` +
    `&lang=${encodeURIComponent(locale || "de")}`;

  const isEn = locale === "en";

  const subject = isEn
    ? "Reset your Let Me Bowl password"
    : "Setze dein Let Me Bowl Passwort zurück";

  const text = isEn
    ? [
        "We received a request to reset your Let Me Bowl password.",
        "",
        "Set a new password using this link:",
        resetUrl,
        "",
        "This link is valid for 1 hour.",
        "If you did not request this, you can ignore this email.",
      ].join("\n")
    : [
        "Wir haben eine Anfrage erhalten, dein Let Me Bowl Passwort zurückzusetzen.",
        "",
        "Über diesen Link kannst du ein neues Passwort festlegen:",
        resetUrl,
        "",
        "Der Link ist 1 Stunde gültig.",
        "Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.",
      ].join("\n");

  return sendMail({
    to: user.email,
    bcc: process.env.MAIL_BCC || undefined,
    subject,
    html: buildResetEmail({ resetUrl, isEn }),
    text: brandedEmailText(text, isEn ? "en" : "de"),
    locale: isEn ? "en" : "de",
  });
}