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
  const t = dict[locale] || dict.de;
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

  return (
    <PortalLayout
      title={`${t.orderNumber} ${order.orderNumber}`}
      subtitle={
        locale === "de"
          ? "Hier findest du alle verfügbaren Details zu dieser Bestellung."
          : "Here you can find all available details for this order."
      }
    >
      <div style={{ display: "grid", gap: "18px" }}>
        {actionData?.message ? (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "14px",
              background: actionData.ok ? "#edf7ee" : "#fff1f1",
              color: actionData.ok ? "#1f6b36" : "#8b2222",
              border: actionData.ok
                ? "1px solid #cfe8d4"
                : "1px solid #efcaca",
              fontWeight: 700,
            }}
          >
            {actionData.message}
          </div>
        ) : null}

        <section
          style={{
            ...card.base,
            padding: "28px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,244,236,1) 100%)",
            border: "1px solid #ece2d0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: colors.muted,
                  marginBottom: "8px",
                }}
              >
                {locale === "de" ? "Bestellübersicht" : "Order overview"}
              </div>

              <h2
                style={{
                  margin: "0 0 10px",
                  fontSize: "32px",
                  lineHeight: 1.08,
                  color: colors.text,
                }}
              >
                {order.orderNumber}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: "15px",
                  lineHeight: 1.7,
                  maxWidth: "760px",
                }}
              >
                {locale === "de"
                  ? "Status, Positionen, Betrag und zugeordnete Informationen dieser Bestellung."
                  : "Status, items, amount and linked information for this order."}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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

              <a
                href={withLang("/bestellungen", locale)}
                style={{
                  ...button.secondary,
                  textDecoration: "none",
                  color: colors.text,
                }}
              >
                {locale === "de" ? "Zurück" : "Back"}
              </a>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <InfoCard
            label={locale === "de" ? "Datum" : "Date"}
            value={formatDate(order.createdAt, locale)}
          />
          <InfoCard
            label={locale === "de" ? "Typ" : "Type"}
            value={order.orderType || "—"}
          />
          <InfoCard
            label={locale === "de" ? "Betrag" : "Amount"}
            value={formatMoney(order.totalAmount, order.currency || "EUR", locale)}
          />
          <InfoCard
            label={locale === "de" ? "Positionen" : "Items"}
            value={String(order.items?.length || 0)}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
            gap: "18px",
          }}
        >
          <div
            style={{
              ...card.base,
              padding: "28px",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px",
                fontSize: "24px",
                color: colors.text,
              }}
            >
              {locale === "de" ? "Positionen" : "Items"}
            </h3>

            {order.items?.length ? (
              <div style={{ display: "grid", gap: "12px" }}>
                {order.items.map((item) => {
                  const isReorderable = Boolean(item.shopifyVariantId);

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: "18px",
                        padding: "18px",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "14px",
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 360px" }}>
                          <div
                            style={{
                              fontSize: "18px",
                              fontWeight: 800,
                              color: colors.text,
                              marginBottom: "8px",
                            }}
                          >
                            {item.title}
                          </div>

                          <div
                            style={{
                              color: colors.muted,
                              fontSize: "14px",
                              lineHeight: 1.6,
                            }}
                          >
                            {locale === "de" ? "Menge" : "Quantity"}: {item.quantity}
                            {item.unit ? ` ${item.unit}` : ""}
                          </div>

                          {item.variantTitle ? (
                            <div
                              style={{
                                marginTop: "6px",
                                color: colors.muted,
                                fontSize: "14px",
                                lineHeight: 1.6,
                              }}
                            >
                              {locale === "de" ? "Variante" : "Variant"}: {item.variantTitle}
                            </div>
                          ) : null}

                          {item.notes ? (
                            <div
                              style={{
                                marginTop: "8px",
                                color: colors.muted,
                                fontSize: "14px",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {item.notes}
                            </div>
                          ) : null}

                          <div
                            style={{
                              marginTop: "10px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
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

                        <div
                          style={{
                            textAlign: "right",
                            minWidth: "140px",
                          }}
                        >
                          {item.unitPrice != null ? (
                            <div
                              style={{
                                fontSize: "14px",
                                color: colors.muted,
                                marginBottom: "6px",
                              }}
                            >
                              {formatMoney(item.unitPrice, order.currency || "EUR", locale)}
                            </div>
                          ) : null}

                          {item.totalPrice != null ? (
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: 800,
                                color: colors.text,
                              }}
                            >
                              {formatMoney(item.totalPrice, order.currency || "EUR", locale)}
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
          </div>

          <div style={{ display: "grid", gap: "18px" }}>
            <SidebarMetaCard
              title={locale === "de" ? "Bestelldaten" : "Order details"}
              entries={[
                {
                  label: locale === "de" ? "Status" : "Status",
                  value: statusLabel,
                },
                {
                  label: locale === "de" ? "Bestellnummer" : "Order number",
                  value: order.orderNumber,
                },
                {
                  label: locale === "de" ? "Bestellt am" : "Ordered on",
                  value: formatDate(order.orderedAt || order.createdAt, locale),
                },
                {
                  label: locale === "de" ? "Lieferdatum" : "Delivery date",
                  value: order.deliveryDate
                    ? formatDate(order.deliveryDate, locale)
                    : "—",
                },
              ]}
            />

            <SidebarMetaCard
              title={locale === "de" ? "Zuordnung" : "Assignment"}
              entries={[
                {
                  label: locale === "de" ? "Kostenstelle" : "Cost center",
                  value: order.costCenter?.name || "—",
                },
                {
                  label: locale === "de" ? "Referenz" : "Reference",
                  value: order.referenceNumber || "—",
                },
                {
                  label: locale === "de" ? "Standort" : "Location",
                  value: order.location?.name || "—",
                },
                {
                  label: locale === "de" ? "Kontakt" : "Contact",
                  value: order.contact
                    ? [order.contact.firstName, order.contact.lastName]
                        .filter(Boolean)
                        .join(" ")
                    : "—",
                },
              ]}
            />

            <SidebarMetaCard
              title={locale === "de" ? "Lieferadresse" : "Delivery address"}
              entries={[
                {
                  label: locale === "de" ? "Bezeichnung" : "Label",
                  value: order.deliveryAddress?.label || "—",
                },
                {
                  label: locale === "de" ? "Adresse" : "Address",
                  value: order.deliveryAddress
                    ? [
                        [order.deliveryAddress.street, order.deliveryAddress.houseNumber]
                          .filter(Boolean)
                          .join(" "),
                        [order.deliveryAddress.postalCode, order.deliveryAddress.city]
                          .filter(Boolean)
                          .join(" "),
                        order.deliveryAddress.country,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "—",
                },
              ]}
            />

            <div
              style={{
                ...card.base,
                padding: "22px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "20px",
                  color: colors.text,
                }}
              >
                {locale === "de" ? "Aktionen" : "Actions"}
              </h3>

              <p
                style={{
                  margin: "0 0 16px",
                  color: colors.muted,
                  lineHeight: 1.6,
                  fontSize: "14px",
                }}
              >
                {locale === "de"
                  ? "Du kannst diese Bestellung erneut in den Warenkorb legen oder im Portal stornieren."
                  : "You can add this order to the cart again or cancel it in the portal."}
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
                        ? "Stornieren"
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

              {hasReorderableItems ? (
                <div
                  style={{
                    marginTop: "12px",
                    color: colors.muted,
                    fontSize: "13px",
                    lineHeight: 1.55,
                  }}
                >
                  {locale === "de"
                    ? `${reorderableItems.length} Position(en) sind für den Reorder verfügbar.`
                    : `${reorderableItems.length} item(s) are available for reorder.`}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "12px",
                    color: colors.muted,
                    fontSize: "13px",
                    lineHeight: 1.55,
                  }}
                >
                  {locale === "de"
                    ? "Für ältere Bestellungen fehlen noch Shopify-Variant-IDs."
                    : "Older orders do not yet contain Shopify variant IDs."}
                </div>
              )}
            </div>
          </div>
        </section>

        {(order.subtotalAmount != null ||
          order.taxAmount != null ||
          order.totalAmount != null) && (
          <section
            style={{
              ...card.base,
              padding: "28px",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px",
                fontSize: "24px",
                color: colors.text,
              }}
            >
              {locale === "de" ? "Preisübersicht" : "Price summary"}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <InfoCard
                label={locale === "de" ? "Zwischensumme" : "Subtotal"}
                value={
                  order.subtotalAmount != null
                    ? formatMoney(order.subtotalAmount, order.currency || "EUR", locale)
                    : "—"
                }
              />
              <InfoCard
                label={locale === "de" ? "Steuern" : "Tax"}
                value={
                  order.taxAmount != null
                    ? formatMoney(order.taxAmount, order.currency || "EUR", locale)
                    : "—"
                }
              />
              <InfoCard
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

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: "10px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "22px",
          fontWeight: 800,
          color: colors.text,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SidebarMetaCard({ title, entries }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "22px",
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: "20px",
          color: colors.text,
        }}
      >
        {title}
      </h3>

      <div style={{ display: "grid", gap: "12px" }}>
        {entries.map((entry) => (
          <div
            key={`${title}-${entry.label}`}
            style={{
              padding: "12px 14px",
              borderRadius: "14px",
              background: "#f8f4ec",
              border: "1px solid #ece2d0",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.muted,
                marginBottom: "6px",
              }}
            >
              {entry.label}
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: colors.text,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {entry.value || "—"}
            </div>
          </div>
        ))}
      </div>
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