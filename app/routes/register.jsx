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
import { syncCustomerToShopify } from "../lib/shopify.server.js";
import LanguageSwitch from "../components/LanguageSwitch.jsx";

const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  soft: "#faf7f1",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  goldDark: "#b8934f",
  dangerBg: "#fff4f4",
  dangerText: "#8b2222",
  dangerLine: "#efcaca",
  successBg: "#edf7ee",
  successText: "#1f6b36",
  successLine: "#cfe8d4",
};

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
  const privacyAccepted = String(formData.get("privacyAccepted") || "") === "on";

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
      message: t.registerFillRequired || "Bitte alle Pflichtfelder ausfüllen.",
      values,
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      locale,
      message: t.registerEmailInvalid || "Bitte gib eine gültige E-Mail-Adresse ein.",
      values,
    };
  }

  if (username.length < 3) {
    return {
      ok: false,
      locale,
      message: t.registerUsernameShort || "Der Benutzername muss mindestens 3 Zeichen lang sein.",
      values,
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      locale,
      message: t.registerPasswordShort || "Das Passwort muss mindestens 8 Zeichen lang sein.",
      values,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      locale,
      message: t.registerPasswordMismatch || "Die Passwörter stimmen nicht überein.",
      values,
    };
  }

  if (!privacyAccepted) {
    return {
      ok: false,
      locale,
      message:
        locale === "en"
          ? "Please confirm that the company account request may be processed."
          : "Bitte bestätige, dass die Anfrage für das Firmenkonto verarbeitet werden darf.",
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
      message:
        t.registerUserExists ||
        "Diese E-Mail-Adresse oder dieser Benutzername ist bereits registriert.",
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

      isActive: false,
      isAdmin: false,
      role: "ORDERER",
      mustResetPassword: false,
      invoicePurchaseEnabled: false,

      billing: {
        create: {
          companyName,
          contactName: `${firstName} ${lastName}`.trim(),
          email,
          phone,
        },
      },
    },
    include: {
      billing: true,
    },
  });

  try {
    const shopifyResult = await syncCustomerToShopify({
      id: user.id,
      companyName: user.companyName,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,

      billingAddress: user.billing
        ? [
            user.billing.companyName,
            user.billing.contactName,
            user.billing.street,
            user.billing.zip,
            user.billing.city,
            user.billing.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "",
      billingStreet: user.billing?.street || "",
      billingZip: user.billing?.zip || "",
      billingCity: user.billing?.city || "",
      billingCountry: user.billing?.country || "",
    });

    console.log(
      "Shopify Sync erfolgreich:",
      shopifyResult.action,
      shopifyResult.customer?.id
    );
  } catch (shopifyError) {
    console.error("Shopify Sync fehlgeschlagen:", shopifyError);
  }

  return {
    ok: true,
    locale,
    message:
      locale === "en"
        ? "Thank you for registering. We have received your company account request and will review it shortly. Once approved, you will be able to access your Let Me Bowl portal. Invoice purchase is reviewed and approved separately."
        : "Vielen Dank für deine Registrierung. Wir haben deine Anfrage für ein Firmenkonto erhalten und prüfen sie zeitnah. Sobald dein Zugang freigegeben wurde, kannst du dein Let Me Bowl Portal nutzen. Rechnungskauf wird separat geprüft und freigegeben.",
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
          "Company account for orders, invoices and saved billing data",
          "Approval process to protect your business account from misuse",
          "Prepared for delivery addresses, cost centers and internal order flows",
        ]
      : [
          "Firmenkonto für Bestellungen, Rechnungen und gespeicherte Rechnungsdaten",
          "Freigabeprozess schützt dein Firmenkonto vor Missbrauch",
          "Vorbereitet für Lieferadressen, Kostenstellen und interne Bestellabläufe",
        ];

  return (
    <div className="lmbRegisterRoot">
      <style>{`
        .lmbRegisterRoot {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.10), transparent 26%),
            linear-gradient(180deg, ${colors.bg} 0%, #f1ece3 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: ${colors.text};
        }

        .lmbRegisterPage {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 18px 36px;
        }

        .lmbRegisterTopbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .lmbRegisterLogo {
          text-decoration: none;
          color: ${colors.text};
          font-weight: 950;
          letter-spacing: 0.08em;
          font-size: 15px;
        }

        .lmbRegisterLayout {
          display: grid;
          grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
          gap: 18px;
          align-items: stretch;
        }

        .lmbRegisterSide,
        .lmbRegisterFormWrap {
          border-radius: 28px;
          border: 1px solid rgba(226, 218, 203, 0.95);
          background: rgba(255,255,255,0.92);
          box-shadow: 0 18px 50px rgba(24,24,24,0.055);
          min-width: 0;
        }

        .lmbRegisterSide {
          padding: 28px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.16), transparent 32%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
        }

        .lmbRegisterFormWrap {
          padding: 28px;
        }

        .lmbEyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: ${colors.goldDark};
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .lmbSideTitle {
          margin: 0;
          font-size: clamp(36px, 4.2vw, 58px);
          line-height: 0.95;
          letter-spacing: -0.058em;
          color: ${colors.text};
          max-width: 520px;
        }

        .lmbSideText {
          margin: 18px 0 0;
          color: ${colors.muted};
          font-size: 16px;
          line-height: 1.75;
          max-width: 520px;
          font-weight: 600;
        }

        .lmbBulletList {
          display: grid;
          gap: 10px;
          margin-top: 24px;
        }

        .lmbBulletItem {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(231, 223, 207, 0.95);
        }

        .lmbBulletIcon {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
          color: #fff;
          font-size: 12px;
          font-weight: 950;
          margin-top: 1px;
        }

        .lmbBulletText {
          color: ${colors.text};
          font-size: 14px;
          line-height: 1.65;
          font-weight: 700;
        }

        .lmbProcessBox {
          margin-top: 24px;
          padding: 18px;
          border-radius: 20px;
          background: rgba(21,21,21,0.045);
          border: 1px solid rgba(21,21,21,0.07);
        }

        .lmbProcessTitle {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 950;
          color: ${colors.text};
        }

        .lmbProcessSteps {
          display: grid;
          gap: 8px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.55;
          font-weight: 650;
        }

        .lmbInvoiceNotice {
          margin-top: 14px;
          padding: 18px;
          border-radius: 20px;
          background: rgba(200,169,106,0.12);
          border: 1px solid rgba(200,169,106,0.32);
        }

        .lmbInvoiceNoticeTitle {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 950;
          color: ${colors.text};
        }

        .lmbInvoiceNoticeText {
          margin: 0;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.65;
          font-weight: 700;
        }

        .lmbSideFooter {
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
          font-weight: 600;
        }

        .lmbFormHead {
          margin-bottom: 18px;
        }

        .lmbFormTitle {
          margin: 0 0 8px;
          font-size: 31px;
          line-height: 1.08;
          color: ${colors.text};
          letter-spacing: -0.035em;
        }

        .lmbFormText {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          max-width: 640px;
          font-weight: 600;
        }

        .lmbAlert {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 800;
          line-height: 1.5;
        }

        .lmbAlertError {
          background: ${colors.dangerBg};
          color: ${colors.dangerText};
          border: 1px solid ${colors.dangerLine};
        }

        .lmbSuccessCard {
          padding: 22px;
          border-radius: 22px;
          background: ${colors.successBg};
          border: 1px solid ${colors.successLine};
          color: ${colors.successText};
          margin-bottom: 16px;
        }

        .lmbSuccessTitle {
          margin: 0 0 8px;
          font-size: 22px;
          letter-spacing: -0.02em;
        }

        .lmbSuccessText {
          margin: 0;
          font-size: 15px;
          line-height: 1.7;
          font-weight: 650;
        }

        .lmbSuccessHint {
          margin-top: 14px;
          padding: 14px 15px;
          border-radius: 16px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(47,107,53,0.16);
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 700;
        }

        .lmbSection {
          padding: 17px;
          border-radius: 20px;
          background: ${colors.soft};
          border: 1px solid rgba(231, 223, 207, 0.95);
          margin-bottom: 12px;
        }

        .lmbSectionTitle {
          margin: 0 0 13px;
          font-size: 13px;
          font-weight: 950;
          color: ${colors.text};
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .lmbGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .lmbFull {
          grid-column: 1 / -1;
        }

        .lmbField {
          display: block;
          min-width: 0;
        }

        .lmbLabel {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-weight: 800;
          color: ${colors.text};
          font-size: 14px;
        }

        .lmbRequired {
          color: #b27b26;
          font-weight: 950;
        }

        .lmbInput {
          width: 100%;
          min-height: 52px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(221, 214, 201, 0.95);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
          color: ${colors.text};
          padding: 0 15px;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .lmbInput:focus {
          border-color: ${colors.gold};
          box-shadow: 0 0 0 4px rgba(200,169,106,0.12);
        }

        .lmbHelpText {
          margin-top: 7px;
          color: ${colors.muted};
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 600;
        }

        .lmbCheckbox {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px;
          border-radius: 18px;
          background: #fff;
          border: 1px solid rgba(221, 214, 201, 0.95);
          color: ${colors.muted};
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 650;
          margin-bottom: 12px;
        }

        .lmbCheckbox input {
          margin-top: 4px;
          flex-shrink: 0;
        }

        .lmbSubmitButton {
          width: 100%;
          min-height: 56px;
          margin-top: 8px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
          color: #fff;
          font-size: 15px;
          font-weight: 950;
          box-shadow: 0 14px 30px rgba(200,169,106,0.24);
          cursor: pointer;
        }

        .lmbSubmitButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .lmbBottomLine {
          margin-top: 16px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.7;
          font-weight: 600;
        }

        .lmbBottomLink {
          color: ${colors.text};
          font-weight: 950;
          text-decoration: none;
        }

        @media (max-width: 980px) {
          .lmbRegisterLayout {
            grid-template-columns: 1fr;
          }

          .lmbRegisterSide,
          .lmbRegisterFormWrap {
            padding: 22px 18px;
            border-radius: 22px;
          }

          .lmbSideTitle {
            font-size: clamp(34px, 9vw, 48px);
          }
        }

        @media (max-width: 700px) {
          .lmbRegisterPage {
            padding: 20px 14px 28px;
          }

          .lmbRegisterTopbar {
            margin-bottom: 16px;
          }

          .lmbGrid {
            grid-template-columns: 1fr;
          }

          .lmbFull {
            grid-column: auto;
          }

          .lmbFormTitle {
            font-size: 26px;
          }

          .lmbSideText,
          .lmbFormText {
            font-size: 14px;
          }

          .lmbSection {
            padding: 15px;
            border-radius: 18px;
          }

          .lmbInput {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="lmbRegisterPage">
        <div className="lmbRegisterTopbar">
          <a href="https://letmebowl-catering.de" className="lmbRegisterLogo">
            LET ME BOWL
          </a>

          <LanguageSwitch />
        </div>

        <div className="lmbRegisterLayout">
          <section className="lmbRegisterSide">
            <div>
              <div className="lmbEyebrow">
                {locale === "en" ? "Business registration" : "Firmenregistrierung"}
              </div>

              <h1 className="lmbSideTitle">
                {locale === "en"
                  ? "Your business account for Let Me Bowl."
                  : "Dein Firmenkonto für Let Me Bowl."}
              </h1>

              <p className="lmbSideText">
                {locale === "en"
                  ? "Create access for company orders, invoices and structured ordering workflows. Your account will be reviewed before activation."
                  : "Erstelle deinen Zugang für Firmenbestellungen, Rechnungen und strukturierte Bestellabläufe. Dein Konto wird vor der Freischaltung geprüft."}
              </p>

              <div className="lmbBulletList">
                {bullets.map((item) => (
                  <div key={item} className="lmbBulletItem">
                    <span className="lmbBulletIcon">✓</span>
                    <div className="lmbBulletText">{item}</div>
                  </div>
                ))}
              </div>

              <div className="lmbProcessBox">
                <h3 className="lmbProcessTitle">
                  {locale === "en" ? "How approval works" : "So läuft die Freigabe"}
                </h3>

                <div className="lmbProcessSteps">
                  <div>
                    1.{" "}
                    {locale === "en"
                      ? "You submit your company details."
                      : "Du sendest deine Firmendaten ab."}
                  </div>
                  <div>
                    2.{" "}
                    {locale === "en"
                      ? "We review and activate the account."
                      : "Wir prüfen und aktivieren das Konto."}
                  </div>
                  <div>
                    3.{" "}
                    {locale === "en"
                      ? "You receive access to the portal."
                      : "Du erhältst Zugriff auf das Portal."}
                  </div>
                </div>
              </div>

              <div className="lmbInvoiceNotice">
                <h3 className="lmbInvoiceNoticeTitle">
                  {locale === "en" ? "Invoice purchase" : "Rechnungskauf"}
                </h3>

                <p className="lmbInvoiceNoticeText">
                  {locale === "en"
                    ? "Invoice purchase is not automatically available. It is only enabled for verified and approved business customers after a separate review."
                    : "Rechnungskauf ist nicht automatisch verfügbar. Diese Zahlungsart wird nur für geprüfte und freigegebene Firmenkunden nach separater Prüfung aktiviert."}
                </p>
              </div>
            </div>

            <div className="lmbSideFooter">
              {locale === "en"
                ? "Already registered? Sign in and manage your business data directly in the portal."
                : "Bereits registriert? Melde dich an und verwalte deine Firmendaten direkt im Portal."}
            </div>
          </section>

          <section className="lmbRegisterFormWrap">
            <div className="lmbFormHead">
              <h2 className="lmbFormTitle">
                {locale === "en" ? "Request company access" : "Firmenzugang beantragen"}
              </h2>

              <p className="lmbFormText">
                {locale === "en"
                  ? "Fill in the form below. After submitting, your request will appear in the admin area as pending approval."
                  : "Fülle das Formular aus. Nach dem Absenden erscheint deine Anfrage im Adminbereich als wartende Freigabe."}
              </p>
            </div>

            {actionData?.message && !isSuccess ? (
              <div className="lmbAlert lmbAlertError">{actionData.message}</div>
            ) : null}

            {isSuccess ? (
              <div className="lmbSuccessCard">
                <h3 className="lmbSuccessTitle">
                  {locale === "en" ? "Request received" : "Anfrage erhalten"}
                </h3>
                <p className="lmbSuccessText">{actionData.message}</p>

                <div className="lmbSuccessHint">
                  {locale === "en"
                    ? "Important: Invoice purchase is not activated automatically. It will be reviewed separately and enabled only after approval."
                    : "Wichtig: Rechnungskauf ist nicht automatisch aktiviert. Diese Zahlungsart wird separat geprüft und erst nach Freigabe aktiviert."}
                </div>
              </div>
            ) : null}

            {!isSuccess ? (
              <Form method="post">
                <div className="lmbSection">
                  <h3 className="lmbSectionTitle">
                    {locale === "en" ? "Company" : "Firma"}
                  </h3>

                  <div className="lmbGrid">
                    <div className="lmbFull">
                      <Field
                        label={t.company || "Firma"}
                        name="companyName"
                        defaultValue={values.companyName}
                        placeholder={t.companyPlaceholder || "z. B. Muster GmbH"}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="lmbSection">
                  <h3 className="lmbSectionTitle">
                    {locale === "en" ? "Contact person" : "Ansprechpartner"}
                  </h3>

                  <div className="lmbGrid">
                    <Field
                      label={t.firstName || "Vorname"}
                      name="firstName"
                      defaultValue={values.firstName}
                      placeholder={t.firstNamePlaceholder || "Vorname"}
                      required
                    />

                    <Field
                      label={t.lastName || "Nachname"}
                      name="lastName"
                      defaultValue={values.lastName}
                      placeholder={t.lastNamePlaceholder || "Nachname"}
                      required
                    />

                    <Field
                      label={t.phone || "Telefon"}
                      name="phone"
                      defaultValue={values.phone}
                      placeholder={t.phonePlaceholder || "Telefonnummer"}
                    />

                    <div className="lmbFull">
                      <Field
                        label={t.email || "E-Mail"}
                        name="email"
                        type="email"
                        defaultValue={values.email}
                        placeholder={t.emailPlaceholder || "name@firma.de"}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="lmbSection">
                  <h3 className="lmbSectionTitle">
                    {locale === "en" ? "Access" : "Zugang"}
                  </h3>

                  <div className="lmbGrid">
                    <div className="lmbFull">
                      <Field
                        label={t.username || "Benutzername"}
                        name="username"
                        defaultValue={values.username}
                        placeholder={t.usernamePlaceholder || "z. B. muster-gmbh"}
                        required
                        help={
                          locale === "en"
                            ? "At least 3 characters. Used for login together with your password."
                            : "Mindestens 3 Zeichen. Wird später für den Login verwendet."
                        }
                      />
                    </div>

                    <Field
                      label={t.password || "Passwort"}
                      name="password"
                      type="password"
                      placeholder={t.passwordRegisterPlaceholder || "Mindestens 8 Zeichen"}
                      required
                      help={
                        locale === "en"
                          ? "Minimum 8 characters."
                          : "Mindestens 8 Zeichen."
                      }
                    />

                    <Field
                      label={t.confirmPassword || "Passwort bestätigen"}
                      name="confirmPassword"
                      type="password"
                      placeholder={t.confirmPasswordPlaceholder || "Passwort wiederholen"}
                      required
                    />
                  </div>
                </div>

                <label className="lmbCheckbox">
                  <input type="checkbox" name="privacyAccepted" required />
                  <span>
                    {locale === "en"
                      ? "I confirm that Let Me Bowl may process this company account request and contact me regarding activation."
                      : "Ich bestätige, dass Let Me Bowl diese Firmenkonto-Anfrage verarbeiten und mich zur Freischaltung kontaktieren darf."}
                  </span>
                </label>

                <button
                  type="submit"
                  className="lmbSubmitButton"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t.registerSubmitting || "Wird gesendet..."
                    : locale === "en"
                    ? "Submit company account request"
                    : "Firmenkonto beantragen"}
                </button>
              </Form>
            ) : null}

            <div className="lmbBottomLine">
              {t.alreadyRegistered || "Bereits registriert?"}{" "}
              <a href={withLang("/login", locale)} className="lmbBottomLink">
                {t.loginNow || "Jetzt anmelden"}
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
  help = "",
}) {
  return (
    <label className="lmbField">
      <span className="lmbLabel">
        {label}
        {required ? <span className="lmbRequired">*</span> : null}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue || ""}
        required={required}
        className="lmbInput"
      />

      {help ? <div className="lmbHelpText">{help}</div> : null}
    </label>
  );
}