import AuthLayout from "../components/AuthLayout.jsx";
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
  const actionData = useActionData(), navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting", en = locale === "en";
  const tokenStillValid = actionData?.tokenValid !== undefined ? actionData.tokenValid : valid;
  return <AuthLayout locale={locale} title={en ? "Set a new password." : "Neues Passwort festlegen."} intro={tokenStillValid ? en ? "Choose a password of at least 8 characters." : "Wähle ein Passwort mit mindestens 8 Zeichen." : en ? "This reset link is invalid or has expired. Request a new link to continue." : "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen Link an."}>
    {actionData?.message && <p className="lmb-portal-alert is-error" role="alert">{actionData.message}</p>}
    {tokenStillValid ? <Form method="post" className="lmb-auth-form"><input type="hidden" name="token" value={token} />
      <label className="lmb-portal-field"><span>{en ? "New password" : "Neues Passwort"}</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="lmb-portal-field"><span>{en ? "Confirm password" : "Passwort bestätigen"}</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <button type="submit" className="lmb-portal-button" disabled={isSubmitting}>{isSubmitting ? en ? "Saving…" : "Wird gespeichert…" : en ? "Save new password" : "Neues Passwort speichern"}</button>
    </Form> : <a className="lmb-portal-button" href={withLang("/passwort-vergessen", locale)}>{en ? "Request a new reset link" : "Neuen Reset-Link anfordern"}</a>}
    <p className="lmb-auth-back"><a href={withLang("/login", locale)}>{en ? "Back to sign in" : "Zurück zur Anmeldung"}</a></p>
  </AuthLayout>;
}
