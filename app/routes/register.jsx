import PortalBrand from "../components/PortalBrand.jsx";
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
      message:
        t.registerEmailInvalid || "Bitte gib eine gültige E-Mail-Adresse ein.",
      values,
    };
  }

  if (username.length < 3) {
    return {
      ok: false,
      locale,
      message:
        t.registerUsernameShort ||
        "Der Benutzername muss mindestens 3 Zeichen lang sein.",
      values,
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      locale,
      message:
        t.registerPasswordShort ||
        "Das Passwort muss mindestens 8 Zeichen lang sein.",
      values,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      locale,
      message:
        t.registerPasswordMismatch || "Die Passwörter stimmen nicht überein.",
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

  let user;

  try {
    user = await prisma.portalUser.create({
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
  } catch (dbError) {
    console.error("Registrierung DB-Fehler:", dbError);

    return {
      ok: false,
      locale,
      message:
        locale === "en"
          ? "The registration could not be saved. Please try again."
          : "Die Registrierung konnte nicht gespeichert werden. Bitte versuche es erneut.",
      values,
    };
  }

  // WICHTIG:
  // Shopify-Sync darf die Registrierung nicht blockieren.
  // Der Nutzer wird im Portal angelegt. Shopify läuft danach optional im Hintergrund.
  syncCustomerToShopify({
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
  })
    .then((shopifyResult) => {
      console.log(
        "Shopify Sync erfolgreich:",
        shopifyResult.action,
        shopifyResult.customer?.id
      );
    })
    .catch((shopifyError) => {
      console.error(
        "Shopify Sync fehlgeschlagen, Registrierung bleibt trotzdem gültig:",
        shopifyError
      );
    });

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


      <div className="lmbRegisterPage">
        <div className="lmbRegisterTopbar">
          <PortalBrand subtitle={locale === "en" ? "Your company account" : "Dein Firmenkonto"} />

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
            <figure className="lmb-register-photo"><img src="/brand/catering-table.webp" width="640" height="427" alt={locale === "en" ? "Colourful bowls and wraps for your team" : "Bunte Bowls und Wraps für dein Team"} /><figcaption>{locale === "en" ? "Serving suggestion" : "Serviervorschlag"}</figcaption></figure>
          </section>

          <section className="lmbRegisterFormWrap">
            <div className="lmbFormHead">
              <h2 className="lmbFormTitle">
                {locale === "en" ? "Request company access" : "Firmenzugang beantragen"}
              </h2>

              <p className="lmbFormText">
                {locale === "en"
                  ? "Fill in the form below. We will review your details and then activate your account."
                  : "Fülle das Formular aus. Wir prüfen deine Angaben und schalten deinen Zugang anschließend frei."}
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