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
    throw redirect(`/dashboard?lang=${locale}`);
  }

  return { locale };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;

  const formData = await request.formData();

  const login = String(formData.get("login") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!login || !password) {
    return { ok: false, message: t.loginFieldsMissing };
  }

  const user = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
    },
  });

  if (!user) {
    return { ok: false, message: t.userNotFound };
  }

  if (!user.isActive) {
    return { ok: false, message: t.accessDisabled };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    return { ok: false, message: t.passwordWrong };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);

  return redirect(`/dashboard?lang=${locale}`, {
    headers: {
      "Set-Cookie": createSessionCookie(sessionToken, expiresAt),
    },
  });
}

export default function LoginPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const t = dict[locale] || dict.de;

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        
        {/* LEFT SIDE */}
        <div style={styles.left}>
          <div>
            <div style={styles.logo}>LET ME BOWL</div>

            <h1 style={styles.headline}>{t.loginTitle}</h1>
            <p style={styles.subline}>{t.loginText}</p>

            <div style={styles.featureGrid}>
              <Feature title="Account" text="Zentraler Zugang zu deinem Firmenkonto." />
              <Feature title="Adressen" text="Alle Liefer- und Rechnungsdaten an einem Ort." />
              <Feature title="Rechnungen" text="Zahlungen und Rechnungen übersichtlich." />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (JETZT ZENTRIERT) */}
        <div style={styles.right}>
          <div style={styles.formWrap}>
            
            {/* LANGUAGE */}
            <div style={styles.langSwitch}>
              <a href={withLang("/login", "de")} style={locale === "de" ? styles.langActive : styles.lang}>
                DE
              </a>
              <span>|</span>
              <a href={withLang("/login", "en")} style={locale === "en" ? styles.langActive : styles.lang}>
                EN
              </a>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                {locale === "en" ? "Sign in" : "Einloggen"}
              </h2>

              {actionData?.message && (
                <div style={styles.error}>{actionData.message}</div>
              )}

              <Form method="post">
                <div style={styles.field}>
                  <label>{t.loginField}</label>
                  <input name="login" placeholder={t.loginPlaceholder} />
                </div>

                <div style={styles.field}>
                  <label>{t.password}</label>
                  <input type="password" name="password" placeholder={t.passwordPlaceholder} />
                </div>

                <button type="submit" style={styles.button} disabled={isSubmitting}>
                  {isSubmitting ? t.signingIn : t.signInNow}
                </button>
              </Form>

              <div style={styles.links}>
                <a href={withLang("/forgot-password", locale)}>
                  {t.forgotPassword}
                </a>
              </div>

              <div style={styles.links}>
                {t.noAccountYet}{" "}
                <a href={withLang("/register", locale)}>
                  {t.registerNow}
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, text }) {
  return (
    <div style={styles.feature}>
      <div style={styles.featureTitle}>{title}</div>
      <div style={styles.featureText}>{text}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#e9e5dc",
    fontFamily: "Inter, sans-serif",
  },

  wrapper: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    minHeight: "100vh",
  },

  left: {
    padding: "80px 60px",
    display: "flex",
    alignItems: "center",
  },

  logo: {
    fontWeight: 800,
    marginBottom: 30,
  },

  headline: {
    fontSize: 64,
    margin: 0,
  },

  subline: {
    marginTop: 12,
    color: "#555",
  },

  featureGrid: {
    display: "flex",
    gap: 16,
    marginTop: 40,
  },

  feature: {
    background: "#fff",
    padding: 16,
    borderRadius: 16,
    width: 160,
  },

  featureTitle: {
    fontWeight: 700,
  },

  featureText: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
  },

  right: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  formWrap: {
    width: 380,
  },

  langSwitch: {
    textAlign: "right",
    marginBottom: 10,
    fontSize: 14,
  },

  lang: {
    color: "#777",
    textDecoration: "none",
  },

  langActive: {
    fontWeight: 800,
    color: "#000",
    textDecoration: "none",
  },

  card: {
    background: "#fff",
    padding: 28,
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  },

  cardTitle: {
    marginBottom: 20,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
  },

  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "#c8a96a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  links: {
    marginTop: 10,
    fontSize: 14,
  },

  error: {
    background: "#ffecec",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    color: "#b30000",
  },
};