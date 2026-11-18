import AuthLayout from "../components/AuthLayout.jsx";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  verifyPassword,
  createPortalSession,
  createSessionCookie,
  getUserFromRequest,
} from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);



  if (user) {
    if (user.mustResetPassword && !user.isAdmin) {
      throw redirect(`/passwort-aendern?lang=${locale}`);
    }

    if (user.isAdmin) {
      throw redirect(`/admin?lang=${locale}`);
    }

    throw redirect(`/dashboard?lang=${locale}`);
  }

  return { locale };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;
  const formData = await request.formData();

  const loginRaw = String(formData.get("login") || "").trim();
  const login = loginRaw.toLowerCase();
  const password = String(formData.get("password") || "");



  if (!login || !password) {


    return {
      ok: false,
      message: t.loginFieldsMissing || "Bitte E-Mail/Benutzername und Passwort eingeben.",
    };
  }

  const user = await prisma.portalUser.findFirst({
    where: {
      OR: [
        { email: login },
        { username: login },
      ],
    },
  });



  if (!user) {


    return {
      ok: false,
      message: t.userNotFound || "Benutzer wurde nicht gefunden.",
    };
  }

  if (!user.isActive) {


    return {
      ok: false,
      message: t.accessDisabled || "Dieser Zugang ist noch nicht freigeschaltet.",
    };
  }

  if (!user.passwordHash) {


    return {
      ok: false,
      message: "Für diesen Nutzer ist kein Passwort gespeichert. Bitte Passwort zurücksetzen.",
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);



  if (!passwordOk) {


    return {
      ok: false,
      message: t.passwordWrong || "Das Passwort ist falsch.",
    };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);
  const cookie = createSessionCookie(sessionToken, expiresAt);



  let redirectTo = user.isAdmin
    ? `/admin?lang=${locale}`
    : `/dashboard?lang=${locale}`;

  if (user.mustResetPassword && !user.isAdmin) {
    redirectTo = `/passwort-aendern?lang=${locale}`;
  }



  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default function LoginPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData(), navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting", t = dict[locale] || dict.de;
  return <AuthLayout locale={locale} title={locale === "en" ? "Welcome back." : "Schön, dass du da bist."} intro={locale === "en" ? "Sign in to manage your company account." : "Melde dich an und verwalte dein Firmenkonto."}>
    {actionData?.message && <p className="lmb-portal-alert is-error" role="alert">{actionData.message}</p>}
    <Form method="post" className="lmb-auth-form">
      <label className="lmb-portal-field"><span>{t.loginField || "E-Mail oder Benutzername"}</span><input name="login" placeholder={t.loginPlaceholder || "E-Mail oder Benutzername"} autoComplete="username" required /></label>
      <label className="lmb-portal-field"><span>{t.password || "Passwort"}</span><input type="password" name="password" autoComplete="current-password" required /></label>
      <a className="lmb-auth-forgot" href={withLang("/passwort-vergessen", locale)}>{t.forgotPassword || "Passwort vergessen?"}</a>
      <button type="submit" className="lmb-portal-button" disabled={isSubmitting}>{isSubmitting ? t.signingIn || "Wird angemeldet…" : t.signInNow || "Jetzt anmelden"}</button>
    </Form>
    <div className="lmb-auth-create"><p>{t.noAccountYet || "Noch kein Konto?"}</p><a className="lmb-portal-button is-outline" href={withLang("/register", locale)}>{locale === "en" ? "Request a company account" : "Firmenkonto beantragen"}</a></div>
  </AuthLayout>;
}
