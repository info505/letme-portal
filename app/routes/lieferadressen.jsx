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

  const url = new URL(request.url);
  const editId = String(url.searchParams.get("edit") || "");

  const addresses = await prisma.deliveryAddress.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const editAddress = editId
    ? addresses.find((item) => item.id === editId) || null
    : null;

  return { user, locale, addresses, editAddress };
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

  const getAddressData = () => {
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

    return {
      label,
      companyName,
      contactName,
      phone,
      street,
      houseNumber,
      postalCode,
      city,
      country,
      notes,
      isDefault,
    };
  };

  if (intent === "addDelivery") {
    const data = getAddressData();

    if (!data.street || !data.postalCode || !data.city || !data.country) {
      return { ok: false, message: t.addressFormError };
    }

    if (data.isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.deliveryAddress.create({
      data: {
        userId: user.id,
        label: data.label || null,
        companyName: data.companyName || null,
        contactName: data.contactName || null,
        phone: data.phone || null,
        street: data.street,
        houseNumber: data.houseNumber || null,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        notes: data.notes || null,
        isDefault: data.isDefault,
      },
    });

    return { ok: true, message: t.deliveryCreated };
  }

  if (intent === "updateDelivery") {
    const addressId = String(formData.get("addressId") || "");
    const data = getAddressData();

    if (!addressId || !data.street || !data.postalCode || !data.city || !data.country) {
      return { ok: false, message: t.addressFormError };
    }

    const existing = await prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId: user.id,
      },
    });

    if (!existing) {
      return { ok: false, message: t.generalError };
    }

    if (data.isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await prisma.deliveryAddress.update({
      where: { id: addressId },
      data: {
        label: data.label || null,
        companyName: data.companyName || null,
        contactName: data.contactName || null,
        phone: data.phone || null,
        street: data.street,
        houseNumber: data.houseNumber || null,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        notes: data.notes || null,
        isDefault: data.isDefault,
      },
    });

    return { ok: true, message: t.deliveryUpdated };
  }

  if (intent === "deleteDelivery") {
    const addressId = String(formData.get("addressId") || "");

    if (addressId) {
      await prisma.deliveryAddress.deleteMany({
        where: { id: addressId, userId: user.id },
      });
    }

    return { ok: true, message: t.deliveryDeleted };
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

    return { ok: true, message: t.deliveryDefaultUpdated };
  }

  return { ok: false, message: t.generalError };
}

export default function LieferadressenPage() {
  const { locale, addresses, editAddress } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const isSaving = navigation.state === "submitting";
  const isEditMode = Boolean(editAddress);

  return (
    <PortalLayout
      title={t.shippingAddressesTitle}
      subtitle={t.shippingAddressesText}
    >
      {actionData?.message ? (
        <FeedbackBox success={actionData?.ok}>{actionData.message}</FeedbackBox>
      ) : null}

      <div style={{ display: "grid", gap: "18px", maxWidth: "980px" }}>
        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "flex-start",
              marginBottom: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "28px",
                  color: colors.text,
                }}
              >
                {isEditMode ? t.editDeliveryTitle : t.addDeliveryTitle}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  lineHeight: 1.6,
                  fontSize: "15px",
                  maxWidth: "760px",
                }}
              >
                {isEditMode ? t.editDeliveryText : t.shippingAddressesFormText}
              </p>
            </div>

            {isEditMode ? (
              <a href={`?lang=${locale}`} style={cancelLinkStyle}>
                {t.cancel}
              </a>
            ) : null}
          </div>

          <Form method="post">
            <input
              type="hidden"
              name="intent"
              value={isEditMode ? "updateDelivery" : "addDelivery"}
            />
            {isEditMode ? (
              <input type="hidden" name="addressId" value={editAddress.id} />
            ) : null}

            <div style={styles.formGrid}>
              <div style={styles.full}>
                <Field
                  label={t.label}
                  name="label"
                  placeholder={t.labelPlaceholder}
                  defaultValue={editAddress?.label || ""}
                />
              </div>

              <div style={styles.full}>
                <Field
                  label={t.company}
                  name="companyName"
                  placeholder={t.companyPlaceholder}
                  defaultValue={editAddress?.companyName || ""}
                />
              </div>

              <div style={styles.full}>
                <Field
                  label={t.contactPerson}
                  name="contactName"
                  placeholder={t.contactPersonPlaceholder}
                  defaultValue={editAddress?.contactName || ""}
                />
              </div>

              <Field
                label={t.phone}
                name="phone"
                placeholder={t.phonePlaceholder}
                defaultValue={editAddress?.phone || ""}
              />

              <Field
                label={t.country}
                name="country"
                defaultValue={
                  editAddress?.country ||
                  (locale === "en" ? "Germany" : "Deutschland")
                }
                placeholder={t.countryPlaceholder}
              />

              <Field
                label={t.street}
                name="street"
                placeholder={t.streetPlaceholder}
                defaultValue={editAddress?.street || ""}
              />

              <Field
                label={t.houseNumber}
                name="houseNumber"
                placeholder={t.houseNumberPlaceholder}
                defaultValue={editAddress?.houseNumber || ""}
              />

              <Field
                label={t.postalCode}
                name="postalCode"
                placeholder={t.postalCodePlaceholder}
                defaultValue={editAddress?.postalCode || ""}
              />

              <Field
                label={t.city}
                name="city"
                placeholder={t.cityPlaceholder}
                defaultValue={editAddress?.city || ""}
              />

              <div style={styles.full}>
                <label style={{ display: "block" }}>
                  <span style={styles.label}>{t.notes}</span>
                  <textarea
                    name="notes"
                    placeholder={t.notesPlaceholder}
                    defaultValue={editAddress?.notes || ""}
                    rows={4}
                    style={styles.textarea}
                  />
                </label>
              </div>
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={Boolean(editAddress?.isDefault)}
              />
              {t.setAsDefault}
            </label>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button type="submit" style={styles.primaryButton} disabled={isSaving}>
                {isSaving
                  ? t.saving
                  : isEditMode
                  ? t.saveChanges
                  : t.addShipping}
              </button>

              {isEditMode ? (
                <a href={`?lang=${locale}`} style={secondaryLinkStyle}>
                  {t.cancel}
                </a>
              ) : null}
            </div>
          </Form>
        </section>

        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <h3
            style={{
              margin: "0 0 18px",
              fontSize: "28px",
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
            <div style={{ display: "grid", gap: "14px" }}>
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
                  <div style={styles.addressHeader}>
                    <div>
                      <div style={styles.addressTitle}>
                        {address.label || t.shippingAddresses}
                      </div>

                      {address.isDefault ? (
                        <div style={styles.defaultBadge}>{t.defaultAddress}</div>
                      ) : null}
                    </div>

                    <div style={styles.addressActions}>
                      <a
                        href={`?lang=${locale}&edit=${address.id}`}
                        style={secondaryLinkStyle}
                      >
                        {t.edit}
                      </a>

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
                        <button type="submit" style={styles.deleteButton}>
                          {t.delete}
                        </button>
                      </Form>
                    </div>
                  </div>

                  <AddressLine value={address.companyName} />
                  <AddressLine value={address.contactName} />
                  <AddressLine value={[address.street, address.houseNumber].filter(Boolean).join(" ")} />
                  <AddressLine value={[address.postalCode, address.city].filter(Boolean).join(" ")} />
                  <AddressLine value={address.country} />
                  <AddressLine value={address.phone} />
                  {address.notes ? <AddressLine value={address.notes} muted /> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
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
        maxWidth: "980px",
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
        whiteSpace: "pre-wrap",
      }}
    >
      {value}
    </div>
  );
}

const cancelLinkStyle = {
  textDecoration: "none",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#fff",
  color: colors.text,
  fontWeight: 700,
  textAlign: "center",
  border: `1px solid ${colors.border}`,
};

const secondaryLinkStyle = {
  ...button.secondary,
  textDecoration: "none",
  color: colors.text,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const styles = {
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
    width: "100%",
    boxSizing: "border-box",
  },

  textarea: {
    ...input.base,
    background: "#fff",
    border: "1px solid #e4dccb",
    borderRadius: "14px",
    padding: "14px 15px",
    minHeight: "110px",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "16px",
    color: colors.text,
    fontWeight: 600,
    fontSize: "14px",
  },

  addressHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },

  addressTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: colors.text,
  },

  defaultBadge: {
    display: "inline-flex",
    marginTop: "6px",
    padding: "5px 10px",
    borderRadius: "999px",
    background: "#f2eadb",
    color: "#8d6a2f",
    fontSize: "12px",
    fontWeight: 800,
  },

  addressActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  deleteButton: {
    ...button.secondary,
    color: "#8b2222",
    borderColor: "#efcaca",
    background: "#fff8f8",
  },

  primaryButton: {
    ...button.primary,
    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
  },
};