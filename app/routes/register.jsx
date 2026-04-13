import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  hashPassword,
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

  const companyName = String(formData.get("companyName") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const values = {
    companyName,
    firstName,
    lastName,
    username,
    email,
    phone,
  };

  if (
    !companyName ||
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return {
      ok: false,
      locale,
      message: t.registerFillRequired,
      values,
    };
  }

  if (!email.includes("@")) {
    return {
      ok: false,
      locale,
      message: t.registerEmailInvalid,
      values,
    };
  }

  if (username.length < 3) {
    return {
      ok: false,
      locale,
      message: t.registerUsernameShort,
      values,
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      locale,
      message: t.registerPasswordShort,
      values,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      locale,
      message: t.registerPasswordMismatch,
      values,
    };
  }

  const existingUser = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    return {
      ok: false,
      locale,
      message: t.registerUserExists,
      values,
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.portalUser.create({
    data: {
      companyName,
      firstName,
      lastName,
      username,
      email,
      phone,
      passwordHash,
      billing: {
        create: {
          companyName,
          contactName: `${firstName} ${lastName}`,
          email,
          phone,
        },
      },
    },
  });

  const { sessionToken, expiresAt } = await createPortalSession(user.id);

  return redirect(`/dashboard?lang=${locale}`, {
    headers: {
      "Set-Cookie": createSessionCookie(sessionToken, expiresAt),
    },
  });
}

export default function RegisterPage() {
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
          grid-template-columns: minmax(0, 1.05fr) minmax(460px, 560px);
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

        .register-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
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

          .auth-features,
          .register-grid {
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

            <div style={{ maxWidth: "680px" }}>
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
                {t.registerTitle}
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
                {t.registerText}
              </p>
            </div>
          </div>

          <div className="auth-features">
            <FeatureCard
              title={t.account}
              text={
                locale === "en"
                  ? "Create a central business account for your team and orders."
                  : "Erstelle einen zentralen Firmenzugang für Team und Bestellungen."
              }
            />
            <FeatureCard
              title={t.addresses}
              text={
                locale === "en"
                  ? "Store billing and delivery details in one structured place."
                  : "Speichere Rechnungs- und Lieferdaten an einem strukturierten Ort."
              }
            />
            <FeatureCard
              title={t.invoices}
              text={
                locale === "en"
                  ? "Keep invoice information and order history clearly accessible."
                  : "Halte Rechnungsinformationen und Bestellhistorie übersichtlich bereit."
              }
            />
          </div>
        </section>

        <section className="auth-right">
          <div
            style={{
              ...card.base,
              width: "100%",
              maxWidth: "500px",
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
                {t.registerNow}
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
                  ? "Set up your company access for addresses, invoices and future orders."
                  : "Richte deinen Firmenzugang für Adressen, Rechnungen und künftige Bestellungen ein."}
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
              <div className="register-grid">
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field
                    label={t.company}
                    name="companyName"
                    defaultValue={values.companyName}
                    placeholder={t.companyPlaceholder}
                  />
                </div>

                <Field
                  label={t.firstName}
                  name="firstName"
                  defaultValue={values.firstName}
                  placeholder={t.firstNamePlaceholder}
                />

                <Field
                  label={t.lastName}
                  name="lastName"
                  defaultValue={values.lastName}
                  placeholder={t.lastNamePlaceholder}
                />

                <Field
                  label={t.username}
                  name="username"
                  defaultValue={values.username}
                  placeholder={t.usernamePlaceholder}
                />

                <Field
                  label={t.phone}
                  name="phone"
                  defaultValue={values.phone}
                  placeholder={t.phonePlaceholder}
                />

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field
                    label={t.email}
                    name="email"
                    type="email"
                    defaultValue={values.email}
                    placeholder={t.emailPlaceholder}
                  />
                </div>

                <Field
                  label={t.password}
                  name="password"
                  type="password"
                  placeholder={t.passwordRegisterPlaceholder}
                />

                <Field
                  label={t.confirmPassword}
                  name="confirmPassword"
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
                />
              </div>

              <button
                type="submit"
                style={{
                  ...button.primary,
                  width: "100%",
                  fontSize: "15px",
                  marginTop: "18px",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.registerSubmitting : t.registerNow}
              </button>
            </Form>

            <div
              style={{
                marginTop: "16px",
                color: colors.muted,
                fontSize: "14px",
              }}
            >
              {t.alreadyRegistered}{" "}
              <a
                href={withLang("/login", locale)}
                style={{
                  color: colors.text,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {t.loginNow}
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
    <label style={{ display: "block" }}>
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