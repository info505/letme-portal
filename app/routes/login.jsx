import { useState } from "react";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { verifyPassword, createPortalSession, createSessionCookie, getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import PortalIcon from "../components/PortalIcon.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);
  if (user) {
    if (user.mustResetPassword && !user.isAdmin) throw redirect(withLang("/passwort-aendern", locale));
    throw redirect(withLang(user.isAdmin ? "/admin" : "/dashboard", locale));
  }
  return { locale };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const form = await request.formData();
  const login = String(form.get("login") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!login || !password) {
    return { ok: false, message: locale === "en" ? "Please enter your username and password." : "Bitte Benutzername und Passwort eingeben." };
  }
  if (login.length > 254 || password.length > 512) {
    return { ok: false, message: locale === "en" ? "Please check your sign-in details." : "Bitte Zugangsdaten prüfen." };
  }

  const user = await prisma.portalUser.findFirst({ where: { OR: [{ email: login }, { username: login }] } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    // Identical feedback: do not disclose whether an account exists.
    return { ok: false, message: locale === "en" ? "Sign-in failed. Please check your credentials." : "Anmeldung nicht möglich. Bitte Zugangsdaten prüfen." };
  }
  if (!user.isActive) {
    return { ok: false, message: locale === "en" ? "This company account has not been approved yet." : "Dieses Firmenkonto wurde noch nicht freigeschaltet." };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);
  const destination = user.mustResetPassword && !user.isAdmin ? "/passwort-aendern" : user.isAdmin ? "/admin" : "/dashboard";
  return redirect(withLang(destination, locale), { headers: { "Set-Cookie": createSessionCookie(sessionToken, expiresAt) } });
}

export default function LoginPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const en = locale === "en";
  const busy = navigation.state === "submitting";

  return (
    <main className="lmb-auth-screen">
      <nav className="lmb-auth-language" aria-label={en ? "Language" : "Sprache"}>
        <a href={withLang("/login", "de")} aria-current={!en ? "page" : undefined}>DE</a>
        <a href={withLang("/login", "en")} aria-current={en ? "page" : undefined}>EN</a>
      </nav>
      <section className="lmb-auth-card" aria-labelledby="login-heading">
        <div className="lmb-auth-brand">
          <img src="/brand/let-me-bowl-logo.webp" width="80" height="76" alt="Let Me Bowl" />
          <span>LET ME BOWL / {en ? "CUSTOMER ACCOUNT" : "KUNDENPORTAL"}</span>
        </div>
        <h1 className="lmb-auth-title" id="login-heading">{en ? "Welcome back." : "Willkommen zurück."}</h1>
        <p className="lmb-auth-description">
          {en ? "Sign in to manage company orders, billing and account details." : "Melden Sie sich an, um Bestellungen, Rechnungen und Ihr Firmenkonto zu verwalten."}
        </p>
        <Form method="post" className="lmb-auth-form">
          <div className="lmb-auth-field">
            <label htmlFor="portal-login">{en ? "Username or email" : "Benutzername oder E-Mail"}</label>
            <input className="lmb-auth-input" id="portal-login" name="login" type="text" maxLength={254} autoComplete="username" required autoFocus />
          </div>
          <div className="lmb-auth-field lmb-auth-password">
            <label htmlFor="portal-password">{en ? "Password" : "Passwort"}</label>
            <input className="lmb-auth-input" id="portal-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
            <button type="button" className="lmb-auth-eye" aria-label={en ? "Hold to display password" : "Passwort gedrückt halten zum Anzeigen"} aria-pressed={showPassword}
              onPointerDown={e => {if (e.pointerType !== "mouse" || e.button === 0) setShowPassword(true);}}
              onPointerUp={() => setShowPassword(false)} onPointerCancel={() => setShowPassword(false)}
              onPointerLeave={() => setShowPassword(false)} onBlur={() => setShowPassword(false)}
              onKeyDown={e => {if (e.key === " " || e.key === "Enter") {e.preventDefault(); setShowPassword(true);}}}
              onKeyUp={() => setShowPassword(false)}>
              <PortalIcon name={showPassword ? "eye" : "eyeOff"} size={20}/>
            </button>
          </div>
          {actionData?.message && <div role="alert" className="lmb-auth-notice">{actionData.message}</div>}
          <button type="submit" className="lmb-auth-submit" disabled={busy}>
            {busy ? (en ? "Signing in..." : "Wird angemeldet …") : (en ? "Sign in securely" : "Sicher anmelden")}
          </button>
        </Form>
        <div className="lmb-auth-links">
          <a href={withLang("/passwort-vergessen", locale)}>{en ? "Forgot password?" : "Passwort vergessen?"}</a>
          <a href={withLang("/register", locale)}>{en ? "Create account" : "Firmenkonto erstellen"}</a>
        </div>
        <div className="lmb-auth-footnote">{en ? "Protected company access" : "Geschützter Zugang für Firmenkunden"}</div>
      </section>
    </main>
  );
}
