import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  soft: "#fbf8f2",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  fieldLine: "#dfd3bf",
  gold: "#c8a96a",
  goldDark: "#b8934f",
};

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const billing = await prisma.billingProfile.findUnique({
    where: { userId: user.id },
  });

  return { user, locale, billing };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const formData = await request.formData();

  const companyName = String(formData.get("companyName") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const street = String(formData.get("street") || "").trim();
  const houseNumber = String(formData.get("houseNumber") || "").trim();
  const postalCode = String(formData.get("postalCode") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const country = String(formData.get("country") || "").trim();
  const vatId = String(formData.get("vatId") || "").trim();
  const invoiceEmail = String(formData.get("invoiceEmail") || "").trim().toLowerCase();

  if (!companyName || !contactName || !email) {
    return {
      ok: false,
      message:
        t.addressFormError ||
        (locale === "en"
          ? "Please fill in all required fields."
          : "Bitte fülle alle Pflichtfelder aus."),
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Please enter a valid e-mail address."
          : "Bitte gib eine gültige E-Mail-Adresse ein.",
    };
  }

  if (invoiceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail)) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Please enter a valid invoice e-mail address."
          : "Bitte gib eine gültige Rechnungs-E-Mail-Adresse ein.",
    };
  }

  await prisma.billingProfile.upsert({
    where: { userId: user.id },
    update: {
      companyName,
      contactName,
      email,
      phone: phone || null,
      street: street || null,
      houseNumber: houseNumber || null,
      postalCode: postalCode || null,
      city: city || null,
      country: country || null,
      vatId: vatId || null,
      invoiceEmail: invoiceEmail || null,
    },
    create: {
      userId: user.id,
      companyName,
      contactName,
      email,
      phone: phone || null,
      street: street || null,
      houseNumber: houseNumber || null,
      postalCode: postalCode || null,
      city: city || null,
      country: country || null,
      vatId: vatId || null,
      invoiceEmail: invoiceEmail || null,
    },
  });

  return {
    ok: true,
    message:
      t.billingUpdated ||
      (locale === "en"
        ? "Billing details have been updated."
        : "Rechnungsdaten wurden gespeichert."),
  };
}

export default function RechnungsadressePage() {
  const { user, locale, billing } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSaving = navigation.state === "submitting";

  return (
    <PortalLayout
      title={t.billingAddressTitle || (locale === "en" ? "Billing address" : "Rechnungsadresse")}
      subtitle={
        t.billingAddressText ||
        (locale === "en"
          ? "Manage your company billing details for future orders and invoices."
          : "Verwalte deine Rechnungsdaten für künftige Bestellungen und Rechnungen.")
      }
    >
      <style>{`
        .lmbBillingPage {
          width: 100%;
          max-width: 1040px;
          display: grid;
          gap: 18px;
        }

        .lmbBillingIntro {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          background: ${colors.card};
          border: 1px solid ${colors.line};
          border-radius: 26px;
          padding: 24px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
        }

        .lmbBillingEyebrow {
          display: inline-flex;
          width: fit-content;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(200,169,106,0.08);
          color: ${colors.goldDark};
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .lmbBillingIntroTitle {
          margin: 0;
          color: ${colors.text};
          font-size: 26px;
          line-height: 1.1;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .lmbBillingIntroText {
          margin: 9px 0 0;
          color: ${colors.muted};
          font-size: 14.5px;
          line-height: 1.7;
          font-weight: 600;
          max-width: 680px;
        }

        .lmbBillingStatusCard {
          min-width: 210px;
          padding: 16px;
          border-radius: 20px;
          background: ${colors.soft};
          border: 1px solid ${colors.line};
          color: ${colors.text};
        }

        .lmbBillingStatusLabel {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${colors.muted};
          font-weight: 950;
          margin-bottom: 8px;
        }

        .lmbBillingStatusValue {
          font-size: 18px;
          line-height: 1.25;
          font-weight: 950;
          color: ${colors.text};
        }

        .lmbFeedback {
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 850;
          line-height: 1.5;
        }

        .lmbFeedback.success {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .lmbFeedback.error {
          background: #fff4f4;
          color: #8b2222;
          border: 1px solid #efcaca;
        }

        .lmbBillingCard {
          background: ${colors.card};
          border: 1px solid ${colors.line};
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
        }

        .lmbBillingForm {
          display: grid;
          gap: 14px;
        }

        .lmbFormSection {
          padding: 20px;
          border-radius: 22px;
          background: ${colors.soft};
          border: 1px solid ${colors.line};
        }

        .lmbSectionHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .lmbSectionTitle {
          margin: 0;
          font-size: 13px;
          font-weight: 950;
          color: ${colors.text};
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .lmbSectionText {
          margin: 6px 0 0;
          color: ${colors.muted};
          font-size: 13.5px;
          line-height: 1.55;
          font-weight: 600;
        }

        .lmbRequiredHint {
          color: ${colors.goldDark};
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .lmbFormGrid {
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
          font-size: 13px;
          font-weight: 900;
          color: ${colors.text};
        }

        .lmbRequired {
          color: ${colors.goldDark};
          font-weight: 950;
        }

        .lmbInput {
          width: 100%;
          min-height: 52px;
          padding: 0 15px;
          border-radius: 16px;
          border: 1px solid ${colors.fieldLine};
          background: #fff;
          color: ${colors.text};
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
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

        .lmbActions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .lmbPrimaryButton {
          min-width: 230px;
          min-height: 54px;
          border: 0;
          border-radius: 18px;
          background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
          color: #fff;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(200,169,106,0.22);
          padding: 0 20px;
        }

        .lmbPrimaryButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .lmbActionNote {
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.5;
          font-weight: 600;
        }

        @media (max-width: 860px) {
          .lmbBillingIntro {
            grid-template-columns: 1fr;
            padding: 20px;
            border-radius: 22px;
          }

          .lmbBillingStatusCard {
            min-width: 0;
          }

          .lmbBillingCard {
            padding: 20px;
            border-radius: 22px;
          }

          .lmbFormSection {
            padding: 17px;
            border-radius: 20px;
          }

          .lmbFormGrid {
            grid-template-columns: 1fr;
          }

          .lmbFull {
            grid-column: auto;
          }

          .lmbSectionHead {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .lmbRequiredHint {
            white-space: normal;
          }

          .lmbActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .lmbPrimaryButton {
            width: 100%;
          }
        }

        @media (max-width: 460px) {
          .lmbBillingIntroTitle {
            font-size: 23px;
          }

          .lmbBillingCard {
            padding: 16px;
          }

          .lmbFormSection {
            padding: 15px;
          }

          .lmbInput {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="lmbBillingPage">
        <section className="lmbBillingIntro">
          <div>
            <div className="lmbBillingEyebrow">
              {locale === "en" ? "Billing profile" : "Rechnungsprofil"}
            </div>

            <h2 className="lmbBillingIntroTitle">
              {locale === "en"
                ? "Your company billing details"
                : "Deine Rechnungsdaten für Firmenbestellungen"}
            </h2>

            <p className="lmbBillingIntroText">
              {locale === "en"
                ? "These details are used for invoices, order documents and future checkout prefill."
                : "Diese Daten werden für Rechnungen, Bestellunterlagen und spätere vorausgefüllte Checkouts verwendet."}
            </p>
          </div>

          <div className="lmbBillingStatusCard">
            <div className="lmbBillingStatusLabel">
              {locale === "en" ? "Account" : "Konto"}
            </div>
            <div className="lmbBillingStatusValue">
              {user.companyName || user.email}
            </div>
          </div>
        </section>

        {actionData?.message ? (
          <FeedbackBox success={actionData?.ok}>{actionData.message}</FeedbackBox>
        ) : null}

        <section className="lmbBillingCard">
          <Form method="post" className="lmbBillingForm">
            <FormSection
              title={locale === "de" ? "Firma" : "Company"}
              text={
                locale === "en"
                  ? "Company name used on invoices and account documents."
                  : "Firmenname für Rechnungen und Kontounterlagen."
              }
            >
              <div className="lmbFull">
                <Field
                  label={t.company || "Firma"}
                  name="companyName"
                  defaultValue={billing?.companyName || user.companyName || ""}
                  required
                />
              </div>
            </FormSection>

            <FormSection
              title={locale === "de" ? "Ansprechpartner" : "Contact"}
              text={
                locale === "en"
                  ? "Main contact details for invoice questions and order coordination."
                  : "Hauptkontakt für Rückfragen zu Rechnungen und Bestellungen."
              }
            >
              <Field
                label={t.contactPerson || "Ansprechpartner"}
                name="contactName"
                defaultValue={
                  billing?.contactName ||
                  `${user.firstName || ""} ${user.lastName || ""}`.trim()
                }
                placeholder={t.contactPersonPlaceholder || ""}
                required
              />

              <Field
                label={t.email || "E-Mail"}
                name="email"
                type="email"
                defaultValue={billing?.email || user.email || ""}
                placeholder={t.emailPlaceholder || ""}
                required
              />

              <Field
                label={t.phone || "Telefon"}
                name="phone"
                defaultValue={billing?.phone || user.phone || ""}
                placeholder={t.phonePlaceholder || ""}
              />
            </FormSection>

            <FormSection
              title={locale === "de" ? "Adresse" : "Address"}
              text={
                locale === "en"
                  ? "Billing address used for invoice documents."
                  : "Rechnungsadresse für deine Rechnungsdokumente."
              }
            >
              <Field
                label={t.street || "Straße"}
                name="street"
                defaultValue={billing?.street || ""}
                placeholder={t.streetPlaceholder || ""}
              />

              <Field
                label={t.houseNumber || "Hausnummer"}
                name="houseNumber"
                defaultValue={billing?.houseNumber || ""}
                placeholder={t.houseNumberPlaceholder || ""}
              />

              <Field
                label={t.postalCode || "PLZ"}
                name="postalCode"
                defaultValue={billing?.postalCode || ""}
                placeholder={t.postalCodePlaceholder || ""}
              />

              <Field
                label={t.city || "Stadt"}
                name="city"
                defaultValue={billing?.city || ""}
                placeholder={t.cityPlaceholder || ""}
              />

              <Field
                label={t.country || "Land"}
                name="country"
                defaultValue={
                  billing?.country || (locale === "en" ? "Germany" : "Deutschland")
                }
                placeholder={t.countryPlaceholder || ""}
              />
            </FormSection>

            <FormSection
              title={locale === "de" ? "Abrechnung" : "Billing"}
              text={
                locale === "en"
                  ? "Optional details for tax information and separate invoice delivery."
                  : "Optionale Angaben für Steuerdaten und separate Rechnungszustellung."
              }
            >
              <Field
                label={t.vatId || "USt-IdNr."}
                name="vatId"
                defaultValue={billing?.vatId || ""}
                help={
                  locale === "en"
                    ? "Optional. Useful for business invoice data."
                    : "Optional. Sinnvoll für geschäftliche Rechnungsdaten."
                }
              />

              <Field
                label={t.invoiceEmail || "Rechnungs-E-Mail"}
                name="invoiceEmail"
                type="email"
                defaultValue={billing?.invoiceEmail || ""}
                help={
                  locale === "en"
                    ? "Optional. Leave empty if invoices should go to the main e-mail address."
                    : "Optional. Leer lassen, wenn Rechnungen an die normale E-Mail gehen sollen."
                }
              />
            </FormSection>

            <div className="lmbActions">
              <button
                type="submit"
                className="lmbPrimaryButton"
                disabled={isSaving}
              >
                {isSaving ? t.saving || "Speichert..." : t.save || "Speichern"}
              </button>

              <div className="lmbActionNote">
                {locale === "en"
                  ? "Changes are saved directly in your customer account."
                  : "Änderungen werden direkt in deinem Kundenkonto gespeichert."}
              </div>
            </div>
          </Form>
        </section>
      </div>
    </PortalLayout>
  );
}

function FormSection({ title, text, children }) {
  return (
    <div className="lmbFormSection">
      <div className="lmbSectionHead">
        <div>
          <h3 className="lmbSectionTitle">{title}</h3>
          {text ? <p className="lmbSectionText">{text}</p> : null}
        </div>

        <div className="lmbRequiredHint">* Pflichtfeld</div>
      </div>

      <div className="lmbFormGrid">{children}</div>
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

function FeedbackBox({ children, success = true }) {
  return (
    <div className={`lmbFeedback ${success ? "success" : "error"}`}>
      {children}
    </div>
  );
}