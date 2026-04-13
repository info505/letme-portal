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
  const t = dict[locale] || dict.de;
  const formData = await request.formData();

  const login = String(formData.get("login") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const values = { login };

  if (!login || !password) {
    return {
      ok: false,
      locale,
      message: t.loginFieldsMissing,
      values,
    };
  }

  const user = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
    },
  });

  if (!user) {
    return {
      ok: false,
      locale,
      message: t.userNotFound,
      values,
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      locale,
      message: t.accessDisabled,
      values,
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    return {
      ok: false,
      locale,
      message: t.passwordWrong,
      values,
    };
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
  const values = actionData?.values || {};
  const t = dict[locale] || dict.de;

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
                {t.loginTitle}
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
                {t.loginText}
              </p>
            </div>
          </div>

          <div className="auth-features">
            <FeatureCard
              title={t.account}
              text={
                locale === "en"
                  ? "Manage your company profile and central access."
                  : "Verwalte dein Firmenprofil und deinen zentralen Zugang."
              }
            />
            <FeatureCard
              title={t.addresses}
              text={
                locale === "en"
                  ? "Keep billing and delivery information in one place."
                  : "Rechnungs- und Lieferdaten an einem Ort pflegen."
              }
            />
            <FeatureCard
              title={t.invoices}
              text={
                locale === "en"
                  ? "Access invoice data and payment status clearly."
                  : "Rechnungsdaten und Zahlungsstatus übersichtlich einsehen."
              }
            />
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
                {t.signInNow}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                {locale === "en"
                  ? "Use your email address or username to access your portal."
                  : "Melde dich mit deiner E-Mail-Adresse oder deinem Benutzernamen an."}
              </p>
            </div>

            {actionData?.message ? (
              <div
                style={{
                  marginBottom: "18px",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "#fff4f4",
                  color: "#8b2222",
                  border: "1px solid #efcaca",
                  fontWeight: 600,
                }}
              >
                {actionData.message}
              </div>
            ) : null}

            <Form method="post">
              <Field
                label={t.loginField}
                name="login"
                defaultValue={values.login}
                placeholder={t.loginPlaceholder}
              />

              <Field
                label={t.password}
                name="password"
                type="password"
                placeholder={t.passwordPlaceholder}
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
                {isSubmitting ? t.signingIn : t.signInNow}
              </button>
            </Form>

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <a
                href={withLang("/forgot-password", locale)}
                style={{
                  color: colors.muted,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {t.forgotPassword}
              </a>

              <div
                style={{
                  color: colors.muted,
                  fontSize: "14px",
                }}
              >
                {t.noAccountYet}{" "}
                <a
                  href={withLang("/register", locale)}
                  style={{
                    color: colors.text,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {t.registerNow}
                </a>
              </div>
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