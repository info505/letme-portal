import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  getUserFromRequest,
  hashPassword,
  verifyPassword,
} from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const freshUser = await prisma.portalUser.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      username: true,
      companyName: true,
      firstName: true,
      lastName: true,
      isAdmin: true,
      mustResetPassword: true,
    },
  });

  if (!freshUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  return {
    locale,
    user: freshUser,
  };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const formData = await request.formData();

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const freshUser = await prisma.portalUser.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
      isAdmin: true,
      mustResetPassword: true,
    },
  });

  if (!freshUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  if (!newPassword || !confirmPassword) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Please enter and confirm your new password."
          : "Bitte gib dein neues Passwort ein und bestätige es.",
    };
  }

  if (newPassword.length < 8) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Your new password must be at least 8 characters long."
          : "Dein neues Passwort muss mindestens 8 Zeichen lang sein.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The passwords do not match."
          : "Die Passwörter stimmen nicht überein.",
    };
  }

  /*
    Wenn mustResetPassword aktiv ist, kommt der Kunde nach Admin-Reset hierher.
    Dann muss er sein altes Passwort nicht nochmal eingeben, weil er sich gerade
    mit dem temporären Passwort angemeldet hat.

    Wenn mustResetPassword NICHT aktiv ist, verlangen wir zur Sicherheit das aktuelle Passwort.
  */
  if (!freshUser.mustResetPassword) {
    if (!currentPassword) {
      return {
        ok: false,
        message:
          locale === "en"
            ? "Please enter your current password."
            : "Bitte gib dein aktuelles Passwort ein.",
      };
    }

    const currentPasswordOk = await verifyPassword(
      currentPassword,
      freshUser.passwordHash
    );

    if (!currentPasswordOk) {
      return {
        ok: false,
        message:
          locale === "en"
            ? "Your current password is incorrect."
            : "Dein aktuelles Passwort ist nicht korrekt.",
      };
    }
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.portalUser.update({
    where: { id: freshUser.id },
    data: {
      passwordHash,
      mustResetPassword: false,
    },
  });

  if (freshUser.isAdmin) {
    throw redirect(`/admin?lang=${locale}`);
  }

  throw redirect(`/dashboard?lang=${locale}`);
}

export default function ChangePasswordPage() {
  const { locale, user } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSubmitting = navigation.state === "submitting";
  const forcedChange = Boolean(user.mustResetPassword);

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <a href="https://letmebowl-catering.de" style={styles.logo}>
          LET ME BOWL
        </a>

        <div style={styles.lang}>
          <a
            href={withLang("/passwort-aendern", "de")}
            style={locale === "de" ? styles.langActive : styles.langLink}
          >
            DE
          </a>
          <span style={styles.langSep}>|</span>
          <a
            href={withLang("/passwort-aendern", "en")}
            style={locale === "en" ? styles.langActive : styles.langLink}
          >
            EN
          </a>
        </div>
      </div>

      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Let Me Bowl Portal</div>

          <h1 style={styles.title}>
            {locale === "en" ? "Change password" : "Passwort ändern"}
          </h1>

          <p style={styles.text}>
            {forcedChange
              ? locale === "en"
                ? "For security reasons, please set a new password before continuing."
                : "Aus Sicherheitsgründen musst du jetzt ein neues Passwort vergeben, bevor du fortfahren kannst."
              : locale === "en"
              ? "You can change your portal password here."
              : "Hier kannst du dein Portal-Passwort ändern."}
          </p>

          <div style={forcedChange ? styles.noticeWarn : styles.notice}>
            {forcedChange
              ? locale === "en"
                ? "You logged in with a temporary password. Please choose your own new password now."
                : "Du hast dich mit einem temporären Passwort angemeldet. Bitte wähle jetzt dein eigenes neues Passwort."
              : locale === "en"
              ? "Enter your current password and choose a new one."
              : "Gib dein aktuelles Passwort ein und wähle ein neues Passwort."}
          </div>

          {actionData?.message ? (
            <div style={styles.error}>{actionData.message}</div>
          ) : null}

          <Form method="post">
            {!forcedChange ? (
              <label style={styles.field}>
                <span style={styles.label}>
                  {locale === "en" ? "Current password" : "Aktuelles Passwort"}
                </span>
                <input
                  type="password"
                  name="currentPassword"
                  placeholder={
                    locale === "en"
                      ? "Enter current password"
                      : "Aktuelles Passwort eingeben"
                  }
                  style={styles.input}
                />
              </label>
            ) : null}

            <label style={styles.field}>
              <span style={styles.label}>
                {locale === "en" ? "New password" : "Neues Passwort"}
              </span>
              <input
                type="password"
                name="newPassword"
                placeholder={
                  locale === "en"
                    ? "At least 8 characters"
                    : "Mindestens 8 Zeichen"
                }
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>
                {locale === "en"
                  ? "Confirm new password"
                  : "Neues Passwort bestätigen"}
              </span>
              <input
                type="password"
                name="confirmPassword"
                placeholder={
                  locale === "en"
                    ? "Repeat new password"
                    : "Neues Passwort wiederholen"
                }
                style={styles.input}
              />
            </label>

            <button type="submit" style={styles.button} disabled={isSubmitting}>
              {isSubmitting
                ? locale === "en"
                  ? "Saving..."
                  : "Wird gespeichert..."
                : locale === "en"
                ? "Save new password"
                : "Neues Passwort speichern"}
            </button>
          </Form>

          {!forcedChange ? (
            <div style={styles.links}>
              <a
                href={
                  user.isAdmin
                    ? withLang("/admin", locale)
                    : withLang("/dashboard", locale)
                }
                style={styles.link}
              >
                {locale === "en" ? "Back" : "Zurück"}
              </a>
            </div>
          ) : null}
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
    maxWidth: "560px",
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
    fontSize: "46px",
    lineHeight: 0.98,
    letterSpacing: "-0.04em",
    color: "#111",
  },

  text: {
    margin: "0 0 18px",
    color: "#5f5a52",
    fontSize: "17px",
    lineHeight: 1.6,
  },

  notice: {
    background: "#f7f2e8",
    padding: "13px 14px",
    borderRadius: "14px",
    marginBottom: "16px",
    color: "#5f5a52",
    border: "1px solid #e5dcc8",
    fontWeight: 700,
    lineHeight: 1.5,
  },

  noticeWarn: {
    background: "#fff8e8",
    padding: "13px 14px",
    borderRadius: "14px",
    marginBottom: "16px",
    color: "#7a5a18",
    border: "1px solid #efdcae",
    fontWeight: 800,
    lineHeight: 1.5,
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

  link: {
    color: "#5f5a52",
    fontWeight: 700,
    textDecoration: "none",
  },
};