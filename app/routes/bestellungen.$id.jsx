import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import { card, button, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orderId = String(params.id || "");

  if (!orderId) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  const order = await prisma.portalOrder.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    include: {
      items: true,
      costCenter: true,
      deliveryAddress: true,
      location: true,
      contact: true,
    },
  });

  if (!order) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  return { user, locale, order };
}

export async function action({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orderId = String(params.id || "");
  if (!orderId) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent !== "cancel") {
    return {
      ok: false,
      message: locale === "de" ? "Ungültige Aktion." : "Invalid action.",
    };
  }

  const existingOrder = await prisma.portalOrder.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
  });

  if (!existingOrder) {
    throw redirect(`/bestellungen?lang=${locale}`);
  }

  if (existingOrder.status === "CANCELLED") {
    return {
      ok: false,
      message:
        locale === "de"
          ? "Diese Bestellung wurde bereits storniert."
          : "This order has already been cancelled.",
    };
  }

  if (existingOrder.status === "DELIVERED") {
    return {
      ok: false,
      message:
        locale === "de"
          ? "Gelieferte Bestellungen können nicht mehr storniert werden."
          : "Delivered orders can no longer be cancelled.",
    };
  }

  await prisma.portalOrder.update({
    where: { id: existingOrder.id },
    data: {
      status: "CANCELLED",
    },
  });

  return {
    ok: true,
    message:
      locale === "de"
        ? "Die Bestellung wurde storniert."
        : "The order has been cancelled.",
  };
}

export default function BestellungDetailPage() {
  const { locale, order } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const t = dict[locale] || dict.de;

  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  const reorderableItems = (order.items || []).filter(
    (item) => item.shopifyVariantId && Number(item.quantity || 0) > 0
  );

  const hasReorderableItems = reorderableItems.length > 0;
  const reorderUrl = hasReorderableItems
    ? buildShopifyCartPermalink(reorderableItems)
    : null;

  const canCancel =
    order.status !== "CANCELLED" && order.status !== "DELIVERED";

  const isCancelling =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "cancel";

  const contactName = order.contact
    ? [order.contact.firstName, order.contact.lastName].filter(Boolean).join(" ")
    : order.billingContactName || "—";

  const deliveryAddressText = order.deliveryAddress
    ? [
        order.deliveryAddress.label,
        order.deliveryAddress.companyName,
        order.deliveryAddress.contactName,
        [order.deliveryAddress.street, order.deliveryAddress.houseNumber]
          .filter(Boolean)
          .join(" "),
        [order.deliveryAddress.postalCode, order.deliveryAddress.city]
          .filter(Boolean)
          .join(" "),
        order.deliveryAddress.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "—";

  return (
    <PortalLayout
      title={`${t.orderNumber} ${order.orderNumber}`}
      subtitle={
        locale === "de"
          ? "Alle wichtigen Informationen zu dieser Bestellung auf einen Blick."
          : "All important information for this order at a glance."
      }
    >
      <style>{`
        .order-detail-shell {
          display: grid;
          gap: 18px;
          max-width: 1180px;
        }

        .order-hero {
          position: relative;
          overflow: hidden;
          padding: 30px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 30%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226, 218, 203, 0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .order-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent 30%);
        }

        .order-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) auto;
          gap: 20px;
          align-items: start;
        }

        .order-eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .order-hero-title {
          margin: 0;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: ${colors.text};
        }

        .order-hero-copy {
          margin: 14px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          line-height: 1.7;
          font-size: 15px;
        }

        .order-hero-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .order-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .detail-card {
          padding: 26px;
          border-radius: 24px;
        }

        .detail-section-title {
          margin: 0 0 18px;
          font-size: 24px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .detail-box-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .detail-box {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 16px;
          background: #fff;
        }

        .detail-box-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 8px;
        }

        .detail-box-value {
          font-size: 16px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .items-list {
          display: grid;
          gap: 12px;
        }

        .item-card {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 18px;
          background: #fff;
        }

        .item-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .item-title {
          font-size: 18px;
          font-weight: 800;
          color: ${colors.text};
          margin-bottom: 6px;
        }

        .item-meta {
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .item-price {
          min-width: 140px;
          text-align: right;
        }

        .item-total {
          font-size: 18px;
          font-weight: 800;
          color: ${colors.text};
        }

        .item-unit {
          font-size: 14px;
          color: ${colors.muted};
          margin-bottom: 6px;
        }

        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .action-panel {
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(180deg, #f7f1e7 0%, #efe5d3 100%);
          border: 1px solid #ece2d0;
        }

        .price-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .notice-box {
          padding: 14px 16px;
          border-radius: 14px;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .order-hero-grid,
          .order-grid,
          .detail-box-grid,
          .price-grid {
            grid-template-columns: 1fr;
          }

          .order-hero,
          .detail-card,
          .action-panel {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .detail-section-title {
            font-size: 22px;
          }

          .item-price {
            min-width: 0;
            text-align: left;
          }
        }
      `}</style>

      <div className="order-detail-shell">
        {actionData?.message ? (
          <div
            className="notice-box"
            style={{
              background: actionData.ok ? "#edf7ee" : "#fff1f1",
              color: actionData.ok ? "#1f6b36" : "#8b2222",
              border: actionData.ok
                ? "1px solid #cfe8d4"
                : "1px solid #efcaca",
            }}
          >
            {actionData.message}
          </div>
        ) : null}

        <section className="order-hero">
          <div className="order-hero-grid">
            <div>
              <div className="order-eyebrow">
                {locale === "de" ? "Bestellung" : "Order"}
              </div>

              <h1 className="order-hero-title">{order.orderNumber}</h1>

              <p className="order-hero-copy">
                {locale === "de"
                  ? "Status, Positionen, Beträge und zugeordnete Informationen dieser Bestellung übersichtlich an einem Ort."
                  : "Status, items, pricing and linked information for this order in one clear place."}
              </p>

              <div className="order-hero-actions">
                <a
                  href={withLang("/bestellungen", locale)}
                  style={{
                    ...button.secondary,
                    textDecoration: "none",
                    color: colors.text,
                  }}
                >
                  {locale === "de" ? "Zurück zu Bestellungen" : "Back to orders"}
                </a>
              </div>
            </div>

            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 800,
                  ...statusStyle,
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </section>

        <section
          className="detail-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="detail-section-title">
            {locale === "de" ? "Bestellübersicht" : "Order overview"}
          </h2>

          <div className="detail-box-grid">
            <DetailBox
              label={locale === "de" ? "Bestellt am" : "Ordered on"}
              value={formatDate(order.orderedAt || order.createdAt, locale)}
            />
            <DetailBox
              label={locale === "de" ? "Lieferdatum" : "Delivery date"}
              value={
                order.deliveryDate
                  ? formatDate(order.deliveryDate, locale)
                  : "—"
              }
            />
            <DetailBox
              label={locale === "de" ? "Typ" : "Type"}
              value={order.orderType || "—"}
            />
            <DetailBox
              label={locale === "de" ? "Positionen" : "Items"}
              value={String(order.items?.length || 0)}
            />
            <DetailBox
              label={locale === "de" ? "Kostenstelle" : "Cost center"}
              value={
                order.costCenter
                  ? `${order.costCenter.name}${
                      order.costCenter.code ? ` · ${order.costCenter.code}` : ""
                    }`
                  : "—"
              }
            />
            <DetailBox
              label={locale === "de" ? "Referenz" : "Reference"}
              value={order.referenceNumber || "—"}
            />
          </div>
        </section>

        <div className="order-grid">
          <section
            className="detail-card"
            style={{
              ...card.base,
            }}
          >
            <h2 className="detail-section-title">
              {locale === "de" ? "Kontakt & Lieferung" : "Contact & delivery"}
            </h2>

            <div className="detail-box-grid">
              <DetailBox
                label={locale === "de" ? "Kontakt" : "Contact"}
                value={contactName}
              />
              <DetailBox
                label={locale === "de" ? "E-Mail" : "Email"}
                value={order.billingEmail || "—"}
              />
              <DetailBox
                label={locale === "de" ? "Telefon" : "Phone"}
                value={order.billingPhone || "—"}
              />
              <DetailBox
                label={locale === "de" ? "Standort" : "Location"}
                value={order.location?.name || "—"}
              />
              <DetailBox
                label={locale === "de" ? "Lieferadresse" : "Delivery address"}
                value={deliveryAddressText}
              />
              <DetailBox
                label={locale === "de" ? "Rechnungsfirma" : "Billing company"}
                value={order.billingCompanyName || "—"}
              />
            </div>
          </section>

          <section className="action-panel">
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "24px",
                color: colors.text,
                letterSpacing: "-0.02em",
              }}
            >
              {locale === "de" ? "Aktionen" : "Actions"}
            </h2>

            <p
              style={{
                margin: "0 0 16px",
                color: colors.muted,
                lineHeight: 1.65,
                fontSize: "14px",
              }}
            >
              {locale === "de"
                ? "Du kannst diese Bestellung erneut in den Warenkorb legen oder — falls noch möglich — direkt im Portal stornieren."
                : "You can add this order to the cart again or — if still possible — cancel it directly in the portal."}
            </p>

            <div style={{ display: "grid", gap: "10px" }}>
              {hasReorderableItems ? (
                <a
                  href={reorderUrl}
                  style={{
                    ...button.primary,
                    textDecoration: "none",
                    color: "#fff",
                    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                    textAlign: "center",
                  }}
                >
                  {locale === "de" ? "Erneut bestellen" : "Reorder"}
                </a>
              ) : (
                <span
                  style={{
                    ...button.primary,
                    color: "#fff",
                    background: "#c9c1b0",
                    cursor: "not-allowed",
                    opacity: 0.8,
                    textAlign: "center",
                  }}
                >
                  {locale === "de" ? "Erneut bestellen" : "Reorder"}
                </span>
              )}

              {canCancel ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="cancel" />
                  <button
                    type="submit"
                    style={dangerButton}
                    disabled={isCancelling}
                    onClick={(event) => {
                      const ok = window.confirm(
                        locale === "de"
                          ? "Möchtest du diese Bestellung wirklich stornieren?"
                          : "Do you really want to cancel this order?"
                      );
                      if (!ok) {
                        event.preventDefault();
                      }
                    }}
                  >
                    {isCancelling
                      ? locale === "de"
                        ? "Wird storniert..."
                        : "Cancelling..."
                      : locale === "de"
                      ? "Bestellung stornieren"
                      : "Cancel order"}
                  </button>
                </Form>
              ) : (
                <span
                  style={{
                    ...button.secondary,
                    textAlign: "center",
                    opacity: 0.7,
                    cursor: "not-allowed",
                    color: colors.muted,
                  }}
                >
                  {locale === "de" ? "Nicht stornierbar" : "Cannot be cancelled"}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: "14px",
                color: colors.muted,
                fontSize: "13px",
                lineHeight: 1.55,
              }}
            >
              {hasReorderableItems
                ? locale === "de"
                  ? `${reorderableItems.length} Position(en) können direkt erneut in den Shopify-Warenkorb gelegt werden.`
                  : `${reorderableItems.length} item(s) can be added directly to the Shopify cart again.`
                : locale === "de"
                ? "Für diese Bestellung fehlen noch Shopify-Variant-IDs für einen Reorder."
                : "This order does not yet include Shopify variant IDs for reorder."}
            </div>
          </section>
        </div>

        <section
          className="detail-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="detail-section-title">
            {locale === "de" ? "Positionen" : "Items"}
          </h2>

          {order.items?.length ? (
            <div className="items-list">
              {order.items.map((item) => {
                const isReorderable = Boolean(item.shopifyVariantId);

                return (
                  <div key={item.id} className="item-card">
                    <div className="item-head">
                      <div style={{ minWidth: 0, flex: "1 1 360px" }}>
                        <div className="item-title">{item.title}</div>

                        <div className="item-meta">
                          {locale === "de" ? "Menge" : "Quantity"}: {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </div>

                        {item.variantTitle ? (
                          <div className="item-meta">
                            {locale === "de" ? "Variante" : "Variant"}:{" "}
                            {item.variantTitle}
                          </div>
                        ) : null}

                        {item.notes ? (
                          <div className="item-meta" style={{ whiteSpace: "pre-wrap" }}>
                            {item.notes}
                          </div>
                        ) : null}

                        <div className="badge-row">
                          {isReorderable ? (
                            <span style={okBadgeStyle}>
                              {locale === "de"
                                ? "Für Reorder verfügbar"
                                : "Available for reorder"}
                            </span>
                          ) : (
                            <span style={mutedBadgeStyle}>
                              {locale === "de"
                                ? "Nicht für Reorder verfügbar"
                                : "Not available for reorder"}
                            </span>
                          )}

                          {item.sku ? (
                            <span style={mutedBadgeStyle}>SKU: {item.sku}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="item-price">
                        {item.unitPrice != null ? (
                          <div className="item-unit">
                            {formatMoney(
                              item.unitPrice,
                              order.currency || "EUR",
                              locale
                            )}
                          </div>
                        ) : null}

                        {item.totalPrice != null ? (
                          <div className="item-total">
                            {formatMoney(
                              item.totalPrice,
                              order.currency || "EUR",
                              locale
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBox>
              {locale === "de"
                ? "Für diese Bestellung sind aktuell keine Positionen hinterlegt."
                : "There are currently no items stored for this order."}
            </EmptyBox>
          )}
        </section>

        {(order.subtotalAmount != null ||
          order.taxAmount != null ||
          order.totalAmount != null) && (
          <section
            className="detail-card"
            style={{
              ...card.base,
            }}
          >
            <h2 className="detail-section-title">
              {locale === "de" ? "Preisübersicht" : "Price summary"}
            </h2>

            <div className="price-grid">
              <DetailBox
                label={locale === "de" ? "Zwischensumme" : "Subtotal"}
                value={
                  order.subtotalAmount != null
                    ? formatMoney(
                        order.subtotalAmount,
                        order.currency || "EUR",
                        locale
                      )
                    : "—"
                }
              />
              <DetailBox
                label={locale === "de" ? "Steuern" : "Tax"}
                value={
                  order.taxAmount != null
                    ? formatMoney(order.taxAmount, order.currency || "EUR", locale)
                    : "—"
                }
              />
              <DetailBox
                label={locale === "de" ? "Gesamt" : "Total"}
                value={formatMoney(order.totalAmount, order.currency || "EUR", locale)}
              />
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  );
}

function buildShopifyCartPermalink(items) {
  const lineItems = items
    .filter((item) => item.shopifyVariantId && Number(item.quantity || 0) > 0)
    .map((item) => {
      const variantId = encodeURIComponent(String(item.shopifyVariantId));
      const qty = Math.max(1, Number(item.quantity || 1));
      return `${variantId}:${qty}`;
    });

  return `https://letmebowl-catering.de/cart/${lineItems.join(",")}`;
}

function DetailBox({ label, value }) {
  return (
    <div className="detail-box">
      <div className="detail-box-label">{label}</div>
      <div className="detail-box-value">{value || "—"}</div>
    </div>
  );
}

function formatDate(value, locale) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value, currency = "EUR", locale) {
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? value.toNumber()
      : Number(value || 0);

  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency,
  }).format(num);
}

function getStatusLabel(status, locale) {
  const map = {
    OPEN: locale === "en" ? "Open" : "Offen",
    CONFIRMED: locale === "en" ? "Confirmed" : "Bestätigt",
    IN_PREPARATION: locale === "en" ? "In preparation" : "In Vorbereitung",
    DELIVERED: locale === "en" ? "Delivered" : "Geliefert",
    CANCELLED: locale === "en" ? "Cancelled" : "Storniert",
  };

  return map[status] || status || "—";
}

function getStatusStyle(status) {
  switch (status) {
    case "DELIVERED":
      return {
        background: "#edf7ee",
        color: "#1f6b36",
        border: "1px solid #cfe8d4",
      };
    case "CONFIRMED":
      return {
        background: "#eef4ff",
        color: "#285ea8",
        border: "1px solid #cfddf6",
      };
    case "IN_PREPARATION":
      return {
        background: "#fff6e9",
        color: "#8a5a00",
        border: "1px solid #f0dfbf",
      };
    case "CANCELLED":
      return {
        background: "#fff1f1",
        color: "#8b2222",
        border: "1px solid #efcaca",
      };
    default:
      return {
        background: "#f3f3f3",
        color: "#555",
        border: "1px solid #dfdfdf",
      };
  }
}

function EmptyBox({ children }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "18px",
        background: "#fff",
        color: colors.muted,
        fontSize: "15px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

const okBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#edf7ee",
  color: "#1f6b36",
  border: "1px solid #cfe8d4",
  fontSize: "12px",
  fontWeight: 800,
};

const mutedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#f3f3f3",
  color: "#666",
  border: "1px solid #dfdfdf",
  fontSize: "12px",
  fontWeight: 800,
};

const dangerButton = {
  ...button.secondary,
  width: "100%",
  color: "#8b2222",
  border: "1px solid #efcaca",
  background: "#fff8f8",
  fontWeight: 700,
};