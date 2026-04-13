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

  const addresses = await prisma.deliveryAddress.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return { user, locale, billing, addresses };
}

export async function action({ request }) {
  const locale = getLocaleFromRequest(request);
  const t = dict[locale] || dict.de;
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "saveBilling") {
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
      return {
        ok: false,
        intent,
        message: t.addressFormError,
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
      intent,
      message: t.billingUpdated,
    };
  }

  if (intent === "addDelivery") {
    const label = String(formData.get("label") || "").trim();
    const companyName = String(formData.get("companyName") || "").trim();
    const contactName = String(formData.get("contactName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const street = String(formData.get("street") || "").trim();
    const houseNumber = String(formData.get("houseNumber") || "").trim();
    const postalCode = String(formData.get("postalCode") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const country = String(formData.get("country") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const isDefault = String(formData.get("isDefault") || "") === "on";

    if (!street || !postalCode || !city || !country) {
      return {
        ok: false,
        intent,
        message: t.addressFormError,
      };
    }

    if (isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.deliveryAddress.create({
      data: {
        userId: user.id,
        label: label || null,
        companyName: companyName || null,
        contactName: contactName || null,
        phone: phone || null,
        street,
        houseNumber: houseNumber || null,
        postalCode,
        city,
        country,
        notes: notes || null,
        isDefault,
      },
    });

    return {
      ok: true,
      intent,
      message: t.deliveryCreated,
    };
  }

  if (intent === "deleteDelivery") {
    const addressId = String(formData.get("addressId") || "");

    if (addressId) {
      await prisma.deliveryAddress.deleteMany({
        where: {
          id: addressId,
          userId: user.id,
        },
      });
    }

    return {
      ok: true,
      intent,
      message: t.deliveryDeleted,
    };
  }

  if (intent === "setDefaultDelivery") {
    const addressId = String(formData.get("addressId") || "");

    if (addressId) {
      await prisma.deliveryAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });

      await prisma.deliveryAddress.updateMany({
        where: { id: addressId, userId: user.id },
        data: { isDefault: true },
      });
    }

    return {
      ok: true,
      intent,
      message: t.deliveryDefaultUpdated,
    };
  }

  return {
    ok: false,
    intent,
    message: "Unknown action",
  };
}

export default function AdressenPage() {
  const { user, locale, billing, addresses } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSavingBilling =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "saveBilling";

  const isAddingDelivery =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "addDelivery";

  return (
    <PortalLayout title={t.addressTitle} subtitle={t.addressText}>
      {actionData?.message ? (
        <FeedbackBox success={actionData?.ok}>{actionData.message}</FeedbackBox>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
          marginBottom: "18px",
        }}
      >
        <div style={{ ...card.base, padding: "28px" }}>
          <h3
            style={{
              margin: "0 0 18px",
              fontSize: "24px",
              color: colors.text,
            }}
          >
            {t.billingAddress}
          </h3>

          <Form method="post">
            <input type="hidden" name="intent" value="saveBilling" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.company}
                  name="companyName"
                  defaultValue={billing?.companyName || user.companyName || ""}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
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
                defaultValue={billing?.country || (locale === "en" ? "Germany" : "Deutschland")}
                placeholder={t.countryPlaceholder}
              />

              <Field
                label={t.vatId}
                name="vatId"
                defaultValue={billing?.vatId || ""}
              />

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.invoiceEmail}
                  name="invoiceEmail"
                  type="email"
                  defaultValue={billing?.invoiceEmail || ""}
                />
              </div>
            </div>

            <div style={{ marginTop: "18px" }}>
              <button
                type="submit"
                style={{
                  ...button.primary,
                  background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                }}
                disabled={isSavingBilling}
              >
                {isSavingBilling ? t.saving : t.save}
              </button>
            </div>
          </Form>
        </div>

        <div style={{ ...card.base, padding: "28px" }}>
          <h3
            style={{
              margin: "0 0 18px",
              fontSize: "24px",
              color: colors.text,
            }}
          >
            {t.addDeliveryTitle}
          </h3>

          <Form method="post">
            <input type="hidden" name="intent" value="addDelivery" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.label}
                  name="label"
                  placeholder={t.labelPlaceholder}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.company}
                  name="companyName"
                  placeholder={t.companyPlaceholder}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.contactPerson}
                  name="contactName"
                />
              </div>

              <Field
                label={t.phone}
                name="phone"
                placeholder={t.phonePlaceholder}
              />

              <Field
                label={t.country}
                name="country"
                defaultValue={locale === "en" ? "Germany" : "Deutschland"}
                placeholder={t.countryPlaceholder}
              />

              <Field
                label={t.street}
                name="street"
                placeholder={t.streetPlaceholder}
              />

              <Field
                label={t.houseNumber}
                name="houseNumber"
                placeholder={t.houseNumberPlaceholder}
              />

              <Field
                label={t.postalCode}
                name="postalCode"
                placeholder={t.postalCodePlaceholder}
              />

              <Field
                label={t.city}
                name="city"
                placeholder={t.cityPlaceholder}
              />

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label={t.notes}
                  name="notes"
                  placeholder={t.notesPlaceholder}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "16px",
                color: colors.text,
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              <input type="checkbox" name="isDefault" />
              {t.setAsDefault}
            </label>

            <div style={{ marginTop: "18px" }}>
              <button
                type="submit"
                style={button.secondary}
                disabled={isAddingDelivery}
              >
                {isAddingDelivery ? t.saving : t.addShipping}
              </button>
            </div>
          </Form>
        </div>
      </section>

      <section style={{ ...card.base, padding: "28px" }}>
        <h3
          style={{
            margin: "0 0 18px",
            fontSize: "24px",
            color: colors.text,
          }}
        >
          {t.existingDeliveryAddresses}
        </h3>

        {addresses.length === 0 ? (
          <p
            style={{
              margin: 0,
              color: colors.muted,
              lineHeight: 1.6,
              fontSize: "15px",
            }}
          >
            {t.noDeliverySaved}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {addresses.map((address) => (
              <div
                key={address.id}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: "18px",
                  padding: "18px",
                  background: address.isDefault ? "#fcf9f3" : "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 800,
                        color: colors.text,
                      }}
                    >
                      {address.label || t.shippingAddresses}
                    </div>

                    {address.isDefault ? (
                      <div
                        style={{
                          display: "inline-flex",
                          marginTop: "6px",
                          padding: "5px 10px",
                          borderRadius: "999px",
                          background: "#f2eadb",
                          color: "#8d6a2f",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        {t.defaultAddress}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {!address.isDefault ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="setDefaultDelivery" />
                        <input type="hidden" name="addressId" value={address.id} />
                        <button type="submit" style={button.secondary}>
                          {t.setAsDefault}
                        </button>
                      </Form>
                    ) : null}

                    <Form method="post">
                      <input type="hidden" name="intent" value="deleteDelivery" />
                      <input type="hidden" name="addressId" value={address.id} />
                      <button
                        type="submit"
                        style={{
                          ...button.secondary,
                          color: "#8b2222",
                          borderColor: "#efcaca",
                          background: "#fff8f8",
                        }}
                      >
                        {t.delete}
                      </button>
                    </Form>
                  </div>
                </div>

                <AddressLine value={address.companyName} />
                <AddressLine value={address.contactName} />
                <AddressLine
                  value={[address.street, address.houseNumber].filter(Boolean).join(" ")}
                />
                <AddressLine
                  value={[address.postalCode, address.city].filter(Boolean).join(" ")}
                />
                <AddressLine value={address.country} />
                <AddressLine value={address.phone} />
                {address.notes ? <AddressLine value={address.notes} muted /> : null}
              </div>
            ))}
          </div>
        )}
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
      <span
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: 800,
          color: colors.text,
          fontSize: "13px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={{
          ...input.base,
          background: "#fff",
          border: "1px solid #e4dccb",
          borderRadius: "14px",
          padding: "14px 15px",
        }}
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
      }}
    >
      {children}
    </div>
  );
}

function AddressLine({ value, muted = false }) {
  if (!value) return null;

  return (
    <div
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: "15px",
        lineHeight: 1.6,
        marginBottom: "4px",
      }}
    >
      {value}
    </div>
  );
}