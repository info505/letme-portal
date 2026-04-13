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
      <div style={styles.topbar}>
        <a href="https://letmebowl-catering.de" style={styles.logo}>
          LET ME BOWL
        </a>

        <div style={styles.lang}>
          <a
            href={withLang("/login", "de")}
            style={locale === "de" ? styles.langActive : styles.langLink}
          >
            DE
          </a>
          <span style={styles.langSep}>|</span>
          <a
            href={withLang("/login", "en")}
            style={locale === "en" ? styles.langActive : styles.langLink}
          >
            EN
          </a>
        </div>
      </div>

      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>{t.brand}</div>
          <h1 style={styles.title}>{t.loginTitle}</h1>
          <p style={styles.text}>{t.loginText}</p>

          {actionData?.message ? (
            <div style={styles.error}>{actionData.message}</div>
          ) : null}

          <Form method="post">
            <label style={styles.field}>
              <span style={styles.label}>{t.loginField}</span>
              <input
                name="login"
                placeholder={t.loginPlaceholder}
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>{t.password}</span>
              <input
                type="password"
                name="password"
                placeholder={t.passwordPlaceholder}
                style={styles.input}
              />
            </label>

            <button type="submit" style={styles.button} disabled={isSubmitting}>
              {isSubmitting ? t.signingIn : t.signInNow}
            </button>
          </Form>

          <div style={styles.links}>
            <a href={withLang("/forgot-password", locale)} style={styles.link}>
              {t.forgotPassword}
            </a>
          </div>

          <div style={styles.links}>
            <span style={styles.muted}>{t.noAccountYet} </span>
            <a href={withLang("/register", locale)} style={styles.linkStrong}>
              {t.registerNow}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#efebe2",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "flex",
    flexDirection: "column",
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "28px 34px 0",
  },

  logo: {
    textDecoration: "none",
    color: "#111",
    fontWeight: 800,
    letterSpacing: "0.08em",
    fontSize: "15px",
  },

  lang: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },

  langLink: {
    textDecoration: "none",
    color: "#6f6a61",
    fontWeight: 700,
  },

  langActive: {
    textDecoration: "none",
    color: "#111",
    fontWeight: 800,
  },

  langSep: {
    color: "#8b857b",
  },

  center: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px 48px",
  },

  card: {
    width: "100%",
    maxWidth: "520px",
    background: "#fffdf9",
    border: "1px solid #e5dcc8",
    borderRadius: "24px",
    padding: "36px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.06)",
  },

  eyebrow: {
    color: "#c8a96a",
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontSize: "12px",
    marginBottom: "14px",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "54px",
    lineHeight: 0.95,
    letterSpacing: "-0.04em",
    color: "#111",
  },

  text: {
    margin: "0 0 24px",
    color: "#5f5a52",
    fontSize: "18px",
    lineHeight: 1.6,
  },

  error: {
    background: "#fff1f1",
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "14px",
    color: "#a12626",
    border: "1px solid #efcaca",
    fontWeight: 700,
  },

  field: {
    display: "block",
    marginBottom: "16px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 800,
    color: "#111",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #e2d8c5",
    background: "#fff",
    borderRadius: "14px",
    padding: "15px 16px",
    fontSize: "16px",
    outline: "none",
  },

  button: {
    width: "100%",
    marginTop: "8px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 800,
    padding: "15px 18px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(184,147,79,0.22)",
  },

  links: {
    marginTop: "14px",
    fontSize: "15px",
  },

  muted: {
    color: "#6f6a61",
  },

  link: {
    color: "#5f5a52",
    fontWeight: 700,
    textDecoration: "none",
  },

  linkStrong: {
    color: "#111",
    fontWeight: 800,
    textDecoration: "none",
  },
};