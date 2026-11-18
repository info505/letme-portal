import { createHash } from "node:crypto";
import { prisma } from "./prisma.server.js";
import { createPasswordResetToken, invalidateAllUserResetTokens, sendPasswordResetEmail } from "./password-reset.server.js";

const attempts = new Map();
/** Both entry points use expiring single-use tokens. Never reveal whether an account exists. */
export async function requestPortalPasswordReset({ email, locale = "de" }) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  const en = locale === "en";
  if (normalized.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(normalized)) return {
    ok: false, message: en ? "Please enter a valid email address." : "Bitte gib eine gültige E-Mail-Adresse ein.",
  };
  const answer = { ok: true, message: en ? "If the email exists, you will receive a reset link." : "Wenn die E-Mail existiert, erhältst du einen Reset-Link." };
  const now = Date.now(), key = createHash("sha256").update(normalized).digest("hex");
  for (const [value, until] of attempts) if (until <= now) attempts.delete(value);
  if (attempts.has(key) || attempts.size >= 10_000) return answer;
  attempts.set(key, now + 60_000);
  try {
    const user = await prisma.portalUser.findUnique({ where: { email: normalized }, select: { id: true, email: true } });
    if (user) {
      await invalidateAllUserResetTokens(user.id);
      const { rawToken } = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail({ user, locale: en ? "en" : "de", rawToken });
    }
  } catch {
    console.error("PORTAL_PASSWORD_RESET_UNAVAILABLE");
  }
  return answer;
}
