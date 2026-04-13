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
import { card, button, input, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

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
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const street = String(formData.get("street") || "").trim();
  const houseNumber = String(formData.get("houseNumber") || "").trim();
  const postalCode = String(formData.get("postalCode") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const country = String(formData.get("country") || "").trim();
  const vatId = String(formData.get("vatId") || "").trim();
  const invoiceEmail = String(formData.get("invoiceEmail") || "").trim();

  if (!companyName || !contactName || !email) {
    return { ok: false, message: t.addressFormError };
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

  return { ok: true, message: t.billingUpdated };
}

export default function RechnungsadressePage() {
  const { user, locale, billing } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSaving = navigation.state === "submitting";

  return (
    <PortalLayout title={t.billingAddressTitle} subtitle={t.billingAddressText}>
      {actionData?.message ? (
        <FeedbackBox success={actionData?.ok}>{actionData.message}</FeedbackBox>
      ) : null}

      <section
        style={{
          ...card.base,
          padding: "28px",
          maxWidth: "960px",
        }}
      >
        <Form method="post">
          <div style={styles.formGrid}>
            <div style={styles.full}>
              <Field
                label={t.company}
                name="companyName"
                defaultValue={billing?.companyName || user.companyName || ""}
              />
            </div>

            <div style={styles.full}>
              <Field
                label={t.contactPerson}
                name="contactName"
                defaultValue={
                  billing?.contactName ||
                  `${user.firstName || ""} ${user.lastName || ""}`.trim()
                }
              />
            </div>

            <Field
              label={t.email}
              name="email"
              type="email"
              defaultValue={billing?.email || user.email || ""}
            />

            <Field
              label={t.phone}
              name="phone"
              defaultValue={billing?.phone || user.phone || ""}
            />

            <Field
              label={t.street}
              name="street"
              defaultValue={billing?.street || ""}
              placeholder={t.streetPlaceholder}
            />

            <Field
              label={t.houseNumber}
              name="houseNumber"
              defaultValue={billing?.houseNumber || ""}
              placeholder={t.houseNumberPlaceholder}
            />

            <Field
              label={t.postalCode}
              name="postalCode"
              defaultValue={billing?.postalCode || ""}
              placeholder={t.postalCodePlaceholder}
            />

            <Field
              label={t.city}
              name="city"
              defaultValue={billing?.city || ""}
              placeholder={t.cityPlaceholder}
            />

            <Field
              label={t.country}
              name="country"
              defaultValue={
                billing?.country || (locale === "en" ? "Germany" : "Deutschland")
              }
              placeholder={t.countryPlaceholder}
            />

            <Field
              label={t.vatId}
              name="vatId"
              defaultValue={billing?.vatId || ""}
            />

            <div style={styles.full}>
              <Field
                label={t.invoiceEmail}
                name="invoiceEmail"
                type="email"
                defaultValue={billing?.invoiceEmail || ""}
              />
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <button type="submit" style={styles.primaryButton} disabled={isSaving}>
              {isSaving ? t.saving : t.save}
            </button>
          </div>
        </Form>
      </section>
    </PortalLayout>
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
      <span style={styles.label}>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={styles.input}
      />
    </label>
  );
}

function FeedbackBox({ children, success = true }) {
  return (
    <div
      style={{
        marginBottom: "18px",
        padding: "14px 16px",
        borderRadius: "14px",
        background: success ? "#edf7ee" : "#fff4f4",
        color: success ? "#1f6b36" : "#8b2222",
        border: success ? "1px solid #cfe8d4" : "1px solid #efcaca",
        fontWeight: 700,
        maxWidth: "960px",
      }}
    >
      {children}
    </div>
  );
}

const styles = {
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },

  full: {
    gridColumn: "1 / -1",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 800,
    color: colors.text,
    fontSize: "13px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  input: {
    ...input.base,
    background: "#fff",
    border: "1px solid #e4dccb",
    borderRadius: "14px",
    padding: "14px 15px",
  },

  primaryButton: {
    ...button.primary,
    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
  },
};