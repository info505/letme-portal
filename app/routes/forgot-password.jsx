import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import { layout, card, button, input, colors } from "../lib/ui.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";

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
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      locale,
      message:
        locale === "en"
          ? "Please enter a valid email address."
          : "Bitte gib eine gültige E-Mail-Adresse ein.",
      values: { email },
    };
  }

  return {
    ok: true,
    locale,
    message:
      locale === "en"
        ? "If an account exists for this email, you will receive reset instructions shortly."
        : "Wenn für diese E-Mail ein Konto existiert, erhältst du in Kürze eine Anleitung zum Zurücksetzen.",
    values: { email: "" },
  };
}

export default function ForgotPasswordPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const values = actionData?.values || {};
  const t = dict[locale] || dict.de;

  const pageTitle =
    locale === "en" ? "Reset password" : "Passwort zurücksetzen";
  const pageText =
    locale === "en"
      ? "Enter your email address and we will guide you through the next step."
      : "Gib deine E-Mail-Adresse ein und wir führen dich zum nächsten Schritt.";
  const formTitle =
    locale === "en" ? "Request reset link" : "Link anfordern";
  const formText =
    locale === "en"
      ? "Use the email address connected to your portal account."
      : "Nutze die E-Mail-Adresse, die mit deinem Portal-Konto verknüpft ist.";
  const emailLabel = locale === "en" ? "Email address" : "E-Mail-Adresse";
  const emailPlaceholder =
    locale === "en" ? "name@company.com" : "name@firma.de";
  const submitLabel =
    locale === "en" ? "Send instructions" : "Anleitung senden";
  const submitLoading =
    locale === "en" ? "Sending..." : "Wird gesendet...";
  const backToLogin =
    locale === "en" ? "Back to login" : "Zurück zum Login";
  const feature1Text =
    locale === "en"
      ? "Secure access to your business account."
      : "Sicherer Zugang zu deinem Firmenkonto.";
  const feature2Text =
    locale === "en"
      ? "Structured management of addresses and invoices."
      : "Strukturierte Verwaltung von Adressen und Rechnungen.";
  const feature3Text =
    locale === "en"
      ? "Prepared for orders and future account functions."
      : "Vorbereitet für Bestellungen und künftige Kontofunktionen.";

  return (
    <div style={layout.page}>
      <style>{`
        .auth-layout {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(420px, 520px);
        }

        .auth-left {
          padding: 34px 36px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: linear-gradient(180deg, #f8f6f2 0%, #f3eee4 100%);
          border-right: 1px solid ${colors.border};
        }

        .auth-right {
          padding: 34px 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${colors.bg};
        }

        .auth-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          max-width: 760px;
        }

        @media (max-width: 980px) {
          .auth-layout {
            grid-template-columns: 1fr;
          }

          .auth-left {
            padding: 22px 18px 24px;
            border-right: none;
            border-bottom: 1px solid ${colors.border};
            gap: 28px;
          }

          .auth-right {
            padding: 20px 16px 28px;
          }

          .auth-features {
            grid-template-columns: 1fr;
            max-width: none;
          }
        }
      `}</style>

      <div className="auth-layout">
        <section className="auth-left">
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                marginBottom: "56px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://letmebowl-catering.de"
                style={{
                  textDecoration: "none",
                  color: colors.text,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  fontSize: "15px",
                }}
              >
                LET ME BOWL
              </a>

              <LanguageSwitch />
            </div>

            <div style={{ maxWidth: "640px" }}>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: colors.gold,
                  fontWeight: 700,
                  marginBottom: "14px",
                }}
              >
                {t.brand}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(42px, 5vw, 72px)",
                  lineHeight: 0.98,
                  color: colors.text,
                  letterSpacing: "-0.03em",
                }}
              >
                {pageTitle}
              </h1>

              <p
                style={{
                  margin: "20px 0 0",
                  fontSize: "18px",
                  lineHeight: 1.7,
                  color: colors.muted,
                  maxWidth: "620px",
                }}
              >
                {pageText}
              </p>
            </div>
          </div>

          <div className="auth-features">
            <FeatureCard title={t.account} text={feature1Text} />
            <FeatureCard title={t.addresses} text={feature2Text} />
            <FeatureCard title={t.invoices} text={feature3Text} />
          </div>
        </section>

        <section className="auth-right">
          <div
            style={{
              ...card.base,
              width: "100%",
              maxWidth: "460px",
              padding: "34px",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "28px",
                  color: colors.text,
                  lineHeight: 1.1,
                }}
              >
                {formTitle}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                {formText}
              </p>
            </div>

            {actionData?.message ? (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: actionData.ok ? "#edf7ee" : "#fff4f4",
                  color: actionData.ok ? "#1f6b36" : "#8b2222",
                  border: actionData.ok
                    ? "1px solid #cfe8d4"
                    : "1px solid #efcaca",
                  fontWeight: 600,
                }}
              >
                {actionData.message}
              </div>
            ) : null}

            <Form method="post">
              <Field
                label={emailLabel}
                name="email"
                type="email"
                defaultValue={values.email}
                placeholder={emailPlaceholder}
              />

              <button
                type="submit"
                style={{
                  ...button.primary,
                  width: "100%",
                  fontSize: "15px",
                  marginTop: "6px",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? submitLoading : submitLabel}
              </button>
            </Form>

            <div style={{ marginTop: "16px" }}>
              <a
                href={withLang("/login", locale)}
                style={{
                  color: colors.muted,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {backToLogin}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder = "",
  defaultValue = "",
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "16px",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 700,
          color: colors.text,
          fontSize: "14px",
        }}
      >
        {label}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={input.base}
      />
    </label>
  );
}

function FeatureCard({ title, text }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "18px",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.72)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: colors.text,
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: colors.muted,
        }}
      >
        {text}
      </div>
    </div>
  );
}