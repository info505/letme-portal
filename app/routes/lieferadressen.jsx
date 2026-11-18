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

  const editAddress =
    editId ? addresses.find((item) => item.id === editId) || null : null;

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

      <div className="delivery-shell">
        <section
          className={["delivery-card", "lmb-ui-lieferadressen-1"].filter(Boolean).join(" ")}

        >
          <div className="section-head">
            <div>
              <h3 className="section-title">
                {isEditMode ? t.editDeliveryTitle : t.addDeliveryTitle}
              </h3>

              <p className="section-text">
                {isEditMode ? t.editDeliveryText : t.shippingAddressesFormText}
              </p>
            </div>

            {isEditMode ? (
              <a href={`?lang=${locale}`} className="lmb-ui-lieferadressen-2">
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

            <div className="lmb-ui-lieferadressen-3">
              <div className="lmb-ui-lieferadressen-4">
                <Field
                  label={t.label}
                  name="label"
                  placeholder={t.labelPlaceholder}
                  defaultValue={editAddress?.label || ""}
                />
              </div>

              <div className="lmb-ui-lieferadressen-5">
                <Field
                  label={t.company}
                  name="companyName"
                  placeholder={t.companyPlaceholder}
                  defaultValue={editAddress?.companyName || ""}
                />
              </div>

              <div className="lmb-ui-lieferadressen-6">
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

              <div className="lmb-ui-lieferadressen-7">
                <label className="lmb-ui-lieferadressen-8">
                  <span className="lmb-ui-lieferadressen-9">{t.notes}</span>
                  <textarea
                    name="notes"
                    placeholder={t.notesPlaceholder}
                    defaultValue={editAddress?.notes || ""}
                    rows={4}
                    className="lmb-ui-lieferadressen-10"
                  />
                </label>
              </div>
            </div>

            <label className="lmb-ui-lieferadressen-11">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={Boolean(editAddress?.isDefault)}
              />
              {t.setAsDefault}
            </label>

            <div
              className="lmb-ui-lieferadressen-12"
            >
              <button type="submit" className="lmb-ui-lieferadressen-13" disabled={isSaving}>
                {isSaving
                  ? t.saving
                  : isEditMode
                  ? t.saveChanges
                  : t.addShipping}
              </button>

              {isEditMode ? (
                <a href={`?lang=${locale}`} className="lmb-ui-lieferadressen-14">
                  {t.cancel}
                </a>
              ) : null}
            </div>
          </Form>
        </section>

        <section
          className={["delivery-card", "lmb-ui-lieferadressen-15"].filter(Boolean).join(" ")}

        >
          <div className={["section-head", "lmb-ui-lieferadressen-16"].filter(Boolean).join(" ")} >
            <div>
              <h3 className="section-title">{t.existingDeliveryAddresses}</h3>
              <p className="section-text">
                {locale === "en"
                  ? "Click a saved address to use it as the active address for future orders."
                  : "Klicke eine gespeicherte Adresse an, um sie als aktive Adresse für künftige Bestellungen zu verwenden."}
              </p>
            </div>
          </div>

          {addresses.length === 0 ? (
            <p
              className="lmb-ui-lieferadressen-17"
            >
              {t.noDeliverySaved}
            </p>
          ) : (
            <div className="delivery-list">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`address-card ${address.isDefault ? "active" : ""}`}
                >
                  <Form method="post" className="address-select-form">
                    <input type="hidden" name="intent" value="setDefaultDelivery" />
                    <input type="hidden" name="addressId" value={address.id} />

                    <button type="submit" className="address-select-button">
                      <div className="address-card-top">
                        <div>
                          <div className="address-meta">
                            <div className="address-title">
                              {address.label || t.shippingAddresses}
                            </div>

                            {address.isDefault ? (
                              <span className="default-badge">
                                {t.defaultAddress}
                              </span>
                            ) : null}
                          </div>
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

                      <div className="address-use-hint">
                        {address.isDefault
                          ? locale === "en"
                            ? "This address is currently used for future orders."
                            : "Diese Adresse wird aktuell für künftige Bestellungen verwendet."
                          : locale === "en"
                          ? "Click to use this address for future orders."
                          : "Klicke, um diese Adresse für künftige Bestellungen zu verwenden."}
                      </div>
                    </button>
                  </Form>

                  <div className="address-actions">
                    <a
                      href={`?lang=${locale}&edit=${address.id}`}
                      className="lmb-ui-lieferadressen-18"
                    >
                      {t.edit}
                    </a>

                    {!address.isDefault ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="setDefaultDelivery" />
                        <input type="hidden" name="addressId" value={address.id} />
                        <button type="submit" className="lmb-ui-lieferadressen-19">
                          {locale === "en" ? "Use this address" : "Diese Adresse nutzen"}
                        </button>
                      </Form>
                    ) : null}

                    <Form method="post">
                      <input type="hidden" name="intent" value="deleteDelivery" />
                      <input type="hidden" name="addressId" value={address.id} />
                      <button type="submit" className="lmb-ui-lieferadressen-20">
                        {t.delete}
                      </button>
                    </Form>
                  </div>
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
    <label className="lmb-ui-lieferadressen-21">
      <span className="lmb-ui-lieferadressen-22">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="lmb-ui-lieferadressen-23"
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
        maxWidth: "1080px",
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