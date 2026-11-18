import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
  invalidateAllUserResetTokens,
} from "../lib/password-reset.server.js";

import AuthFrame from "../components/AuthFrame.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect(`/dashboard?lang=${locale}`);
  }

  return { locale };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;

  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      message: t.forgotPasswordInvalidEmail || "Bitte gib eine gültige E-Mail ein.",
    };
  }

  const user = await prisma.portalUser.findUnique({
    where: { email },
  });

  if (user) {
    try {
      await invalidateAllUserResetTokens(user.id);

      const { rawToken } = await createPasswordResetToken(user.id);

      await sendPasswordResetEmail({
        user,
        locale,
        rawToken,
        request,
      });
    } catch (error) {
      console.error("PASSWORD_RESET_MAIL_ERROR:", error);

      return {
        ok: false,
        message: String(error.message || error),
      };
    }
  }

  return {
    ok: true,
    message:
      locale === "en"
        ? "If the email exists, you will receive a reset link."
        : "Wenn die E-Mail existiert, erhältst du einen Reset-Link.",
  };
}

export default function ForgotPasswordPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const busy = useNavigation().state === "submitting";
  const en = locale === "en";
  return (
    <AuthFrame locale={locale} title={en ? "Forgot password?" : "Passwort vergessen?"} description={en ? "Enter your email address to receive a link to reset your password." : "Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link, um Ihr Passwort zurückzusetzen."}>
      {actionData?.message && <div role="status" className={actionData.ok ? "lmb-auth-success" : "lmb-auth-notice"}>{actionData.message}</div>}
      <Form method="post" className="lmb-auth-form">
        <div className="lmb-auth-field">
          <label htmlFor="reset-email">{en ? "Email address" : "E-Mail-Adresse"}</label>
          <input className="lmb-auth-input" id="reset-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="name@firma.de" required />
        </div>
        <button className="lmb-auth-submit" type="submit" disabled={busy}>
          {busy ? (en ? "Sending …" : "Wird gesendet …") : (en ? "Send reset link" : "Reset-Link senden")}
        </button>
      </Form>
      <div className="lmb-auth-links"><a href={withLang("/login",locale)}>{en ? "Back to sign-in" : "Zurück zur Anmeldung"}</a></div>
    </AuthFrame>
  );
}
