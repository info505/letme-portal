import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { hashPassword, getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, withLang } from "../lib/i18n.js";
import {
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  invalidateAllUserResetTokens,
} from "../lib/password-reset.server.js";
import { prisma } from "../lib/prisma.server.js";

import AuthFrame from "../components/AuthFrame.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect(`/dashboard?lang=${locale}`);
  }

  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") || "");

  if (!token) {
    return { locale, token, valid: false };
  }

  const resetToken = await findValidPasswordResetToken(token);

  return {
    locale,
    token,
    valid: Boolean(resetToken),
  };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);

  const formData = await request.formData();
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The reset link is invalid or expired."
          : "Der Reset-Link ist ungültig oder abgelaufen.",
      tokenValid: false,
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The password must be at least 8 characters long."
          : "Das Passwort muss mindestens 8 Zeichen lang sein.",
      tokenValid: true,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The passwords do not match."
          : "Die Passwörter stimmen nicht überein.",
      tokenValid: true,
    };
  }

  const resetToken = await findValidPasswordResetToken(token);

  if (!resetToken) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The reset link is invalid or expired."
          : "Der Reset-Link ist ungültig oder abgelaufen.",
      tokenValid: false,
    };
  }

  const passwordHash = await hashPassword(password);

  await prisma.portalUser.update({
    where: { id: resetToken.userId },
    data: {
      passwordHash,
      mustResetPassword: false,
    },
  });

  await markPasswordResetTokenUsed(resetToken.id);
  await invalidateAllUserResetTokens(resetToken.userId);

  throw redirect(withLang("/login", locale));
}

export default function ResetPasswordPage() {
  const { locale, token, valid } = useLoaderData();
  const actionData = useActionData();
  const busy = useNavigation().state === "submitting";
  const en = locale === "en";
  const stillValid = actionData?.tokenValid !== undefined ? actionData.tokenValid : valid;
  return (
    <AuthFrame locale={locale} title={en ? "Set a new password." : "Neues Passwort setzen."}
      description={stillValid ? (en ? "Choose a strong new password to sign in securely." : "Vergeben Sie ein neues Passwort für Ihr Firmenkonto.") : (en ? "This reset link is invalid or expired." : "Dieser Reset-Link ist ungültig oder abgelaufen.")}>
      {actionData?.message && <p className="lmb-auth-notice" role="alert">{actionData.message}</p>}
      {stillValid ? (
        <Form method="post" className="lmb-auth-form">
          <input type="hidden" name="token" value={token} />
          <div className="lmb-auth-field">
            <label htmlFor="reset-new-password">{en ? "New password" : "Neues Passwort"}</label>
            <input className="lmb-auth-input" id="reset-new-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="lmb-auth-field">
            <label htmlFor="reset-confirm">{en ? "Confirm password" : "Passwort bestätigen"}</label>
            <input className="lmb-auth-input" id="reset-confirm" type="password" name="confirmPassword" autoComplete="new-password" minLength={8} required />
          </div>
          <button className="lmb-auth-submit" type="submit" disabled={busy}>{busy ? (en ? "Saving …" : "Wird gespeichert …") : (en ? "Save new password" : "Neues Passwort speichern")}</button>
        </Form>
      ) : <div className="lmb-auth-links"><a href={withLang("/passwort-vergessen",locale)}>{en ? "Request a new reset link" : "Neuen Reset-Link anfordern"}</a></div>}
    </AuthFrame>
  );
}
