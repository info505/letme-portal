import AuthLayout from "../components/AuthLayout.jsx";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, withLang } from "../lib/i18n.js";
import { requestPortalPasswordReset } from "../lib/password-reset-request.server.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect(`/dashboard?lang=${locale}`);
  }

  return { locale };
}

export async function action({ request }) {
  const formData = await request.formData();
  return requestPortalPasswordReset({ email: formData.get("email"), locale: getLocaleFromRequest(request) });
}

export default function ForgotPasswordPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData(), navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting", en = locale === "en";
  return <AuthLayout locale={locale} title={en ? "Forgot your password?" : "Passwort vergessen?"} intro={en ? "Enter your email address. We will send you a link to set a new password." : "Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du ein neues Passwort festlegen kannst."}>
    {actionData?.message && <p className={`lmb-portal-alert ${actionData.ok ? "is-success" : "is-error"}`} role={actionData.ok ? "status" : "alert"}>{actionData.message}</p>}
    <Form method="post" className="lmb-auth-form"><label className="lmb-portal-field"><span>{en ? "Email address" : "E-Mail-Adresse"}</span><input name="email" type="email" autoComplete="email" placeholder="name@firma.de" required /></label><button type="submit" className="lmb-portal-button" disabled={isSubmitting}>{isSubmitting ? en ? "Sending…" : "Wird gesendet…" : en ? "Send reset link" : "Reset-Link senden"}</button></Form>
    <p className="lmb-auth-back"><a href={withLang("/login", locale)}>{en ? "Back to sign in" : "Zurück zur Anmeldung"}</a></p>
  </AuthLayout>;
}
