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

  console.log("LOGIN LOADER DEBUG:", {
    hasUser: Boolean(user),
    userId: user?.id || null,
    email: user?.email || null,
    username: user?.username || null,
    isActive: user?.isActive || null,
    isAdmin: user?.isAdmin || null,
    mustResetPassword: user?.mustResetPassword || null,
  });

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

  console.log("LOGIN ACTION START:", {
    loginRaw,
    login,
    hasPassword: Boolean(password),
    passwordLength: password.length,
  });

  if (!login || !password) {
    console.log("LOGIN FAILED: Felder fehlen");

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

  console.log("LOGIN USER LOOKUP:", {
    login,
    userFound: Boolean(user),
    userId: user?.id || null,
    email: user?.email || null,
    username: user?.username || null,
    isActive: user?.isActive || null,
    isAdmin: user?.isAdmin || null,
    mustResetPassword: user?.mustResetPassword || null,
    hasPasswordHash: Boolean(user?.passwordHash),
    role: user?.role || null,
  });

  if (!user) {
    console.log("LOGIN FAILED: Nutzer nicht gefunden", { login });

    return {
      ok: false,
      message: t.userNotFound || "Benutzer wurde nicht gefunden.",
    };
  }

  if (!user.isActive) {
    console.log("LOGIN FAILED: Nutzer nicht aktiv", {
      userId: user.id,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
    });

    return {
      ok: false,
      message: t.accessDisabled || "Dieser Zugang ist noch nicht freigeschaltet.",
    };
  }

  if (!user.passwordHash) {
    console.log("LOGIN FAILED: Kein Passwort-Hash vorhanden", {
      userId: user.id,
      email: user.email,
    });

    return {
      ok: false,
      message: "Für diesen Nutzer ist kein Passwort gespeichert. Bitte Passwort zurücksetzen.",
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  console.log("LOGIN PASSWORD CHECK:", {
    login,
    userId: user.id,
    passwordOk,
  });

  if (!passwordOk) {
    console.log("LOGIN FAILED: Passwort falsch", {
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      ok: false,
      message: t.passwordWrong || "Das Passwort ist falsch.",
    };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);
  const cookie = createSessionCookie(sessionToken, expiresAt);

  console.log("LOGIN SESSION CREATED:", {
    userId: user.id,
    email: user.email,
    username: user.username,
    expiresAt,
    hasSessionToken: Boolean(sessionToken),
    cookiePreview: String(cookie).slice(0, 80),
  });

  let redirectTo = user.isAdmin
    ? `/admin?lang=${locale}`
    : `/dashboard?lang=${locale}`;

  if (user.mustResetPassword && !user.isAdmin) {
    redirectTo = `/passwort-aendern?lang=${locale}`;
  }

  console.log("LOGIN SUCCESS REDIRECT:", {
    userId: user.id,
    redirectTo,
  });

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": cookie,
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
          <div style={styles.eyebrow}>{t.brand || "Let Me Bowl"}</div>

          <h1 style={styles.title}>
            {t.loginTitle || "Login"}
          </h1>

          <p style={styles.text}>
            {t.loginText || "Melde dich mit deinem Firmenkonto an."}
          </p>

          {actionData?.message ? (
            <div style={styles.error}>{actionData.message}</div>
          ) : null}

          <Form method="post">
            <label style={styles.field}>
              <span style={styles.label}>
                {t.loginField || "E-Mail oder Benutzername"}
              </span>

              <input
                name="login"
                placeholder={t.loginPlaceholder || "E-Mail oder Benutzername"}
                style={styles.input}
                autoComplete="username"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                {t.password || "Passwort"}
              </span>

              <input
                type="password"
                name="password"
                placeholder={t.passwordPlaceholder || "Passwort"}
                style={styles.input}
                autoComplete="current-password"
              />
            </label>

            <button type="submit" style={styles.button} disabled={isSubmitting}>
              {isSubmitting
                ? t.signingIn || "Wird angemeldet..."
                : t.signInNow || "Jetzt anmelden"}
            </button>
          </Form>

          <div style={styles.links}>
            <a
              href={withLang("/passwort-vergessen", locale)}
              style={styles.link}
            >
              {t.forgotPassword || "Passwort vergessen?"}
            </a>
          </div>

          <div style={styles.links}>
            <span style={styles.muted}>
              {t.noAccountYet || "Noch kein Konto?"}{" "}
            </span>

            <a href={withLang("/register", locale)} style={styles.linkStrong}>
              {t.registerNow || "Jetzt registrieren"}
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