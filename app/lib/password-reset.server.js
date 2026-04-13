import crypto from "crypto";
import { prisma } from "./prisma.server.js";
import { sendMail } from "./mail.server.js";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId) {
  const rawToken = createRawToken();
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 Stunde

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    rawToken,
    expiresAt,
  };
}

export async function findValidPasswordResetToken(rawToken) {
  const tokenHash = sha256(rawToken);

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  return token;
}

export async function markPasswordResetTokenUsed(id) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: {
      usedAt: new Date(),
    },
  });
}

export async function invalidateAllUserResetTokens(userId) {
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });
}

export async function sendPasswordResetEmail({ user, locale, rawToken, request }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const resetUrl = `${origin}/passwort-zuruecksetzen?token=${encodeURIComponent(
    rawToken
  )}&lang=${locale}`;

  const isEn = locale === "en";

  const subject = isEn
    ? "Reset your Let Me Bowl password"
    : "Setze dein Let Me Bowl Passwort zurück";

  const text = isEn
    ? `You requested a password reset for your Let Me Bowl account.

Use this link to set a new password:
${resetUrl}

This link expires in 1 hour.

If you did not request this, you can ignore this email.`
    : `Du hast eine Passwort-Zurücksetzung für dein Let Me Bowl Konto angefordert.

Nutze diesen Link, um ein neues Passwort zu setzen:
${resetUrl}

Der Link ist 1 Stunde gültig.

Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`;

  const html = isEn
    ? `
      <div style="font-family: Inter, Arial, sans-serif; color: #1e1e1e; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Reset your password</h2>
        <p>You requested a password reset for your Let Me Bowl account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Set new password
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
    : `
      <div style="font-family: Inter, Arial, sans-serif; color: #1e1e1e; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Passwort zurücksetzen</h2>
        <p>Du hast eine Passwort-Zurücksetzung für dein Let Me Bowl Konto angefordert.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Neues Passwort setzen
          </a>
        </p>
        <p>Oder kopiere diesen Link in deinen Browser:</p>
        <p>${resetUrl}</p>
        <p>Der Link ist 1 Stunde gültig.</p>
        <p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
      </div>
    `;

  await sendMail({
    to: user.email,
    subject,
    text,
    html,
  });
}