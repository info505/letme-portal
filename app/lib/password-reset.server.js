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

export async function createPasswordResetToken(userId) {
  const rawToken = createRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
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
    where: {
      userId,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
}

export async function sendPasswordResetEmail({ user, locale, rawToken }) {
  const origin = process.env.APP_URL || "https://konto.letmebowl-catering.de";

  const resetUrl = `${origin}/passwort-zuruecksetzen?token=${encodeURIComponent(
    rawToken
  )}&lang=${locale}`;

  const isEn = locale === "en";

  const subject = isEn
    ? "Reset your Let Me Bowl password"
    : "Setze dein Let Me Bowl Passwort zurück";

  const html = isEn
    ? `
      <div style="font-family: Arial, sans-serif; color: #1e1e1e; line-height: 1.6;">
        <h2>Reset your password</h2>
        <p>You requested a password reset for your Let Me Bowl account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Set new password
          </a>
        </p>
        <p>Or copy this link:</p>
        <p>${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; color: #1e1e1e; line-height: 1.6;">
        <h2>Passwort zurücksetzen</h2>
        <p>Du hast eine Passwort-Zurücksetzung für dein Let Me Bowl Konto angefordert.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Neues Passwort setzen
          </a>
        </p>
        <p>Oder kopiere diesen Link:</p>
        <p>${resetUrl}</p>
        <p>Der Link ist 1 Stunde gültig.</p>
      </div>
    `;

  console.log("SENDING PASSWORD RESET MAIL TO:", user.email);
  console.log("MAIL_FROM:", process.env.MAIL_FROM || "Let Me Bowl Catering <onboarding@resend.dev>");

  const result = await resend.emails.send({
    from: process.env.MAIL_FROM || "Let Me Bowl Catering <onboarding@resend.dev>",
    to: user.email,
    bcc: process.env.MAIL_BCC || undefined,
    subject,
    html,
  });

  console.log("RESEND PASSWORD RESET RESULT:", JSON.stringify(result));

  if (result?.error) {
    throw new Error(result.error.message || "Resend mail error");
  }

  return result;
}