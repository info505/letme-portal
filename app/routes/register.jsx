import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { hashPassword, getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import { input, colors } from "../lib/ui.js";
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

  await prisma.portalUser.create({
    data: {
      companyName,
      firstName,
      lastName,
      username,
      email,
      phone,
      passwordHash,

      isActive: false,
      isAdmin: false,
      role: "ORDERER",
      mustResetPassword: false,

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

  return {
    ok: true,
    locale,
    message:
      locale === "en"
        ? "Thank you for registering. We have received your company account request and will review it shortly. Once approved, you will be able to access your Let Me Bowl portal."
        : "Vielen Dank für deine Registrierung. Wir haben deine Anfrage für ein Firmenkonto erhalten und prüfen sie zeitnah. Sobald dein Zugang freigegeben wurde, kannst du dein Let Me Bowl Portal nutzen.",
    values: {},
  };
}

export default function RegisterPage() {
  const { locale } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const values = actionData?.values || {};
  const t = dict[locale] || dict.de;

  const isSuccess = actionData?.ok === true;

  const bullets =
    locale === "en"
      ? [
          "Central business access for orders and invoices",
          "Saved company data for future checkouts",
          "Prepared for delivery addresses and internal structures",
        ]
      : [
          "Zentraler Firmenzugang für Bestellungen und Rechnungen",
          "Gespeicherte Firmendaten für künftige Checkouts",
          "Vorbereitet für Lieferadressen und interne Strukturen",
        ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(200,169,106,0.08), transparent 24%), linear-gradient(180deg, #f7f4ee 0%, #f1ece3 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        .register-page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 18px 36px;
        }

        .register-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .register-logo {
          text-decoration: none;
          color: ${colors.text};
          font-weight: 800;
          letter-spacing: 0.08em;
          font-size: 15px;
        }

        .register-layout {
          display: grid;
          grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
          gap: 18px;
          align-items: start;
        }

        .register-side,
        .register-form-wrap {
          border-radius: 24px;
          border: 1px solid rgba(226, 218, 203, 0.95);
          background: rgba(255,255,255,0.92);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .register-side {
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 30%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
        }

        .register-form-wrap {
          padding: 24px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .side-title {
          margin: 0;
          font-size: clamp(34px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.05em;
          color: ${colors.text};
          max-width: 480px;
        }

        .side-text {
          margin: 16px 0 0;
          color: ${colors.muted};
          font-size: 16px;
          line-height: 1.75;
          max-width: 500px;
        }

        .bullet-list {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .bullet-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 13px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(231, 223, 207, 0.95);
        }

        .bullet-icon {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #c8a96a, #b8934f);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          margin-top: 1px;
        }

        .bullet-text {
          color: ${colors.text};
          font-size: 14px;
          line-height: 1.65;
          font-weight: 600;
        }

        .side-footer {
          margin-top: 20px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
        }

        .form-head {
          margin-bottom: 18px;
        }

        .form-title {
          margin: 0 0 8px;
          font-size: 30px;
          line-height: 1.08;
          color: ${colors.text};
          letter-spacing: -0.03em;
        }

        .form-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          max-width: 620px;
        }

        .alert {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 700;
          line-height: 1.5;
        }

        .alert-error {
          background: #fff4f4;
          color: #8b2222;
          border: 1px solid #efcaca;
        }

        .alert-success {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .section {
          padding: 16px;
          border-radius: 18px;
          background: #faf7f1;
          border: 1px solid rgba(231, 223, 207, 0.95);
          margin-bottom: 12px;
        }

        .section-title {
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 800;
          color: ${colors.text};
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .full {
          grid-column: 1 / -1;
        }

        .submit-button {
          width: 100%;
          min-height: 54px;
          margin-top: 8px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #c8a96a, #b8934f);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 14px 30px rgba(200,169,106,0.22);
          cursor: pointer;
        }

        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .bottom-line {
          margin-top: 16px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
        }

        .bottom-link {
          color: ${colors.text};
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 980px) {
          .register-layout {
            grid-template-columns: 1fr;
          }

          .register-side,
          .register-form-wrap {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .side-title {
            font-size: clamp(32px, 9vw, 46px);
          }
        }

        @media (max-width: 700px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .register-page {
            padding: 20px 14px 28px;
          }
        }
      `}</style>

      <div className="register-page">
        <div className="register-topbar">
          <a href="https://letmebowl-catering.de" className="register-logo">
            LET ME BOWL
          </a>

          <LanguageSwitch />
        </div>

        <div className="register-layout">
          <section className="register-side">
            <div className="eyebrow">
              {locale === "en" ? "Business registration" : "Firmenregistrierung"}
            </div>

            <h1 className="side-title">{t.registerTitle}</h1>

            <p className="side-text">
              {locale === "en"
                ? "Create your business access for orders, invoices and future internal ordering workflows."
                : "Erstelle deinen Firmenzugang für Bestellungen, Rechnungen und spätere interne Bestellabläufe."}
            </p>

            <div className="bullet-list">
              {bullets.map((item) => (
                <div key={item} className="bullet-item">
                  <span className="bullet-icon">✓</span>
                  <div className="bullet-text">{item}</div>
                </div>
              ))}
            </div>

            <div className="side-footer">
              {locale === "en"
                ? "Already registered? Sign in and manage your business data directly in the portal."
                : "Bereits registriert? Melde dich an und verwalte deine Firmendaten direkt im Portal."}
            </div>
          </section>

          <section className="register-form-wrap">
            <div className="form-head">
              <h2 className="form-title">{t.registerNow}</h2>
              <p className="form-text">
                {locale === "en"
                  ? "Set up your company access in a few clear steps. After submitting, your request will be reviewed before activation."
                  : "Richte deinen Firmenzugang in wenigen klaren Schritten ein. Nach dem Absenden wird deine Anfrage geprüft und anschließend freigegeben."}
              </p>
            </div>

            {actionData?.message ? (
              <div
                className={`alert ${
                  isSuccess ? "alert-success" : "alert-error"
                }`}
              >
                {actionData.message}
              </div>
            ) : null}

            {!isSuccess ? (
              <Form method="post">
                <div className="section">
                  <h3 className="section-title">
                    {locale === "en" ? "Company" : "Firma"}
                  </h3>

                  <div className="grid">
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

                <div className="section">
                  <h3 className="section-title">
                    {locale === "en" ? "Contact person" : "Ansprechpartner"}
                  </h3>

                  <div className="grid">
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

                <div className="section">
                  <h3 className="section-title">
                    {locale === "en" ? "Access" : "Zugang"}
                  </h3>

                  <div className="grid">
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
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.registerSubmitting : t.registerNow}
                </button>
              </Form>
            ) : null}

            <div className="bottom-line">
              {t.alreadyRegistered}{" "}
              <a href={withLang("/login", locale)} className="bottom-link">
                {t.loginNow}
              </a>
            </div>
          </section>
        </div>
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
          <span style={{ color: "#b27b26", fontWeight: 800 }}>*</span>
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