import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
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
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      message: t.forgotPasswordInvalidEmail,
      values: { email },
    };
  }

  return {
    ok: true,
    message: t.forgotPasswordNotLive,
    values: { email: "" },
  };
}

export default function ForgotPasswordPage() {
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
            href={withLang("/forgot-password", "de")}
            style={locale === "de" ? styles.langActive : styles.langLink}
          >
            DE
          </a>
          <span style={styles.langSep}>|</span>
          <a
            href={withLang("/forgot-password", "en")}
            style={locale === "en" ? styles.langActive : styles.langLink}
          >
            EN
          </a>
        </div>
      </div>

      <div style={styles.center}>
        <div style={styles.shell}>
          <div style={styles.mainCard}>
            <div style={styles.eyebrow}>{t.brand}</div>
            <h1 style={styles.title}>{t.forgotPasswordTitle}</h1>
            <p style={styles.text}>{t.forgotPasswordText}</p>

            {actionData?.message ? (
              <div
                style={actionData.ok ? styles.successBox : styles.errorBox}
              >
                {actionData.message}
              </div>
            ) : null}

            <Form method="post">
              <label style={styles.field}>
                <span style={styles.label}>{t.resetEmailLabel}</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={actionData?.values?.email || ""}
                  placeholder={t.emailPlaceholder}
                  style={styles.input}
                />
              </label>

              <button
                type="submit"
                style={styles.button}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.sendingInstructions : t.sendInstructions}
              </button>
            </Form>

            <div style={{ marginTop: "16px" }}>
              <a href={withLang("/login", locale)} style={styles.linkStrong}>
                {t.backToLogin}
              </a>
            </div>
          </div>

          <div style={styles.sideCard}>
            <div style={styles.sideEyebrow}>{t.forgotPasswordInfoTitle}</div>
            <p style={styles.sideText}>{t.forgotPasswordInfoText}</p>
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

  shell: {
    width: "100%",
    maxWidth: "980px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 320px",
    gap: "18px",
  },

  mainCard: {
    background: "#fffdf9",
    border: "1px solid #e5dcc8",
    borderRadius: "24px",
    padding: "36px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.06)",
  },

  sideCard: {
    background: "#faf6ee",
    border: "1px solid #e7dcc8",
    borderRadius: "24px",
    padding: "28px",
    alignSelf: "start",
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

  sideEyebrow: {
    color: "#c8a96a",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontSize: "12px",
    marginBottom: "10px",
  },

  sideText: {
    margin: 0,
    color: "#5f5a52",
    fontSize: "15px",
    lineHeight: 1.7,
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

  errorBox: {
    background: "#fff1f1",
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "14px",
    color: "#a12626",
    border: "1px solid #efcaca",
    fontWeight: 700,
  },

  successBox: {
    background: "#edf7ee",
    padding: "12px 14px",
    borderRadius: "12px",
    marginBottom: "14px",
    color: "#1f6b36",
    border: "1px solid #cfe8d4",
    fontWeight: 700,
  },

  linkStrong: {
    color: "#111",
    fontWeight: 800,
    textDecoration: "none",
  },
};