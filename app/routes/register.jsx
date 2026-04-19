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

  const featureItems =
    locale === "en"
      ? [
          "Central company access for team orders",
          "Manage delivery and billing addresses clearly",
          "Prepared for invoices, order history and future B2B functions",
        ]
      : [
          "Zentraler Firmenzugang für Team-Bestellungen",
          "Liefer- und Rechnungsadressen übersichtlich verwalten",
          "Vorbereitet für Rechnungen, Bestellhistorie und spätere B2B-Funktionen",
        ];

  return (
    <div style={layout.page}>
      <style>{`
        .register-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(440px, 560px);
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.10), transparent 24%),
            linear-gradient(180deg, #f8f6f2 0%, #f4efe6 100%);
        }

        .register-left {
          padding: 34px 42px 38px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid rgba(201, 190, 170, 0.45);
        }

        .register-right {
          padding: 34px 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.07), transparent 26%),
            rgba(255,255,255,0.46);
          backdrop-filter: blur(4px);
        }

        .register-brand {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 56px;
        }

        .register-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.7);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .register-left-inner {
          max-width: 700px;
        }

        .register-title {
          margin: 0;
          font-size: clamp(48px, 5vw, 76px);
          line-height: 0.95;
          letter-spacing: -0.05em;
          color: ${colors.text};
          max-width: 620px;
        }

        .register-subtitle {
          margin: 22px 0 0;
          max-width: 610px;
          color: ${colors.muted};
          font-size: 18px;
          line-height: 1.8;
        }

        .register-info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          max-width: 620px;
          margin-top: 34px;
        }

        .info-line {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.62);
          border: 1px solid rgba(231, 223, 207, 0.95);
          box-shadow: 0 10px 26px rgba(24,24,24,0.03);
        }

        .info-check {
          flex: 0 0 24px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          background: linear-gradient(135deg, #c8a96a, #b8934f);
          box-shadow: 0 10px 18px rgba(200,169,106,0.25);
        }

        .register-login-hint {
          margin-top: 26px;
          font-size: 14px;
          color: ${colors.muted};
          line-height: 1.7;
        }

        .register-panel {
          width: 100%;
          max-width: 530px;
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(226, 218, 203, 0.9);
          background: rgba(255,255,255,0.88);
          box-shadow: 0 24px 70px rgba(24,24,24,0.07);
          padding: 34px;
        }

        .register-panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(200,169,106,0.05), transparent 18%);
        }

        .register-panel-head {
          position: relative;
          z-index: 1;
          margin-bottom: 22px;
        }

        .register-panel-title {
          margin: 0 0 10px;
          font-size: 32px;
          line-height: 1.06;
          color: ${colors.text};
          letter-spacing: -0.03em;
        }

        .register-panel-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.75;
          max-width: 430px;
        }

        .register-section {
          position: relative;
          z-index: 1;
          padding: 18px;
          border-radius: 20px;
          background: rgba(248,246,242,0.75);
          border: 1px solid rgba(231, 223, 207, 0.95);
          margin-bottom: 14px;
        }

        .register-section-title {
          margin: 0 0 14px;
          font-size: 13px;
          font-weight: 800;
          color: ${colors.text};
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .register-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .register-alert {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          background: #fff4f4;
          color: #8b2222;
          border: 1px solid #efcaca;
          font-weight: 600;
          line-height: 1.5;
          position: relative;
          z-index: 1;
        }

        .register-submit {
          width: 100%;
          margin-top: 6px;
          min-height: 54px;
          font-size: 15px;
          background: linear-gradient(135deg, #c8a96a, #b8934f);
          box-shadow: 0 14px 30px rgba(200,169,106,0.22);
        }

        .register-bottom {
          margin-top: 18px;
          position: relative;
          z-index: 1;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
        }

        @media (max-width: 1100px) {
          .register-shell {
            grid-template-columns: 1fr;
          }

          .register-left {
            border-right: none;
            border-bottom: 1px solid rgba(201, 190, 170, 0.45);
            padding: 24px 18px 28px;
            gap: 28px;
          }

          .register-right {
            padding: 20px 14px 28px;
          }

          .register-brand {
            margin-bottom: 28px;
          }

          .register-panel {
            padding: 22px 18px;
            border-radius: 22px;
            max-width: 100%;
          }
        }

        @media (max-width: 700px) {
          .register-grid {
            grid-template-columns: 1fr;
          }

          .register-title {
            font-size: clamp(40px, 12vw, 58px);
          }

          .register-subtitle {
            font-size: 16px;
            line-height: 1.7;
          }

          .register-section {
            padding: 14px;
          }
        }
      `}</style>

      <div className="register-shell">
        <section className="register-left">
          <div className="register-left-inner">
            <div className="register-brand">
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

            <div className="register-badge">
              {locale === "en" ? "For business customers" : "Für Firmenkunden"}
            </div>

            <h1 className="register-title">{t.registerTitle}</h1>

            <p className="register-subtitle">
              {locale === "en"
                ? "Create your company account for orders, invoices, delivery addresses and future team ordering workflows."
                : "Erstelle dein Firmenkonto für Bestellungen, Rechnungen, Lieferadressen und spätere Team-Bestellprozesse."}
            </p>

            <div className="register-info-grid">
              {featureItems.map((item) => (
                <div key={item} className="info-line">
                  <span className="info-check">✓</span>
                  <div
                    style={{
                      color: colors.text,
                      fontSize: "15px",
                      lineHeight: 1.7,
                      fontWeight: 600,
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>

            <div className="register-login-hint">
              {locale === "en"
                ? "Already registered? Sign in and manage your company details directly."
                : "Bereits registriert? Melde dich an und verwalte deine Firmendaten direkt."}
            </div>
          </div>
        </section>

        <section className="register-right">
          <div className="register-panel">
            <div className="register-panel-head">
              <h2 className="register-panel-title">{t.registerNow}</h2>
              <p className="register-panel-text">
                {locale === "en"
                  ? "Set up your company access in just a few steps."
                  : "Richte deinen Firmenzugang in wenigen Schritten ein."}
              </p>
            </div>

            {actionData?.message ? (
              <div className="register-alert">{actionData.message}</div>
            ) : null}

            <Form method="post" style={{ position: "relative", zIndex: 1 }}>
              <div className="register-section">
                <h3 className="register-section-title">
                  {locale === "en" ? "Company" : "Firma"}
                </h3>

                <div className="register-grid">
                  <div className="full">
                    <Field
                      label={t.company}
                      name="companyName"
                      defaultValue={values.companyName}
                      placeholder={t.companyPlaceholder}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="register-section">
                <h3 className="register-section-title">
                  {locale === "en" ? "Contact person" : "Ansprechpartner"}
                </h3>

                <div className="register-grid">
                  <Field
                    label={t.firstName}
                    name="firstName"
                    defaultValue={values.firstName}
                    placeholder={t.firstNamePlaceholder}
                    required
                  />

                  <Field
                    label={t.lastName}
                    name="lastName"
                    defaultValue={values.lastName}
                    placeholder={t.lastNamePlaceholder}
                    required
                  />

                  <Field
                    label={t.phone}
                    name="phone"
                    defaultValue={values.phone}
                    placeholder={t.phonePlaceholder}
                  />

                  <div className="full">
                    <Field
                      label={t.email}
                      name="email"
                      type="email"
                      defaultValue={values.email}
                      placeholder={t.emailPlaceholder}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="register-section">
                <h3 className="register-section-title">
                  {locale === "en" ? "Access" : "Zugang"}
                </h3>

                <div className="register-grid">
                  <div className="full">
                    <Field
                      label={t.username}
                      name="username"
                      defaultValue={values.username}
                      placeholder={t.usernamePlaceholder}
                      required
                    />
                  </div>

                  <Field
                    label={t.password}
                    name="password"
                    type="password"
                    placeholder={t.passwordRegisterPlaceholder}
                    required
                  />

                  <Field
                    label={t.confirmPassword}
                    name="confirmPassword"
                    type="password"
                    placeholder={t.confirmPasswordPlaceholder}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  ...button.primary,
                  ...button.base,
                }}
                className="register-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? t.registerSubmitting : t.registerNow}
              </button>
            </Form>

            <div className="register-bottom">
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
  required = false,
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
          fontWeight: 700,
          color: colors.text,
          fontSize: "14px",
        }}
      >
        {label}
        {required ? (
          <span
            style={{
              color: "#b27b26",
              fontWeight: 800,
            }}
          >
            *
          </span>
        ) : null}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={{
          ...input.base,
          minHeight: "52px",
          borderRadius: "16px",
          background: "#fff",
          border: "1px solid rgba(221, 214, 201, 0.95)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
        }}
      />
    </label>
  );
}