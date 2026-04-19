import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import { card, button, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orders = await prisma.portalOrder.findMany({
    where: { userId: user.id },
    include: {
      items: true,
      costCenter: true,
      deliveryAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { user, locale, orders };
}

export default function BestellungenPage() {
  const { locale, orders } = useLoaderData();
  const t = dict[locale] || dict.de;

  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;
  const cancelledCount = orders.filter((order) => order.status === "CANCELLED").length;
  const openCount = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length;

  return (
    <PortalLayout title={t.ordersTitle} subtitle={t.ordersText}>
      <div style={{ display: "grid", gap: "18px" }}>
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <SummaryCard
              eyebrow={locale === "de" ? "Bestellungen" : "Orders"}
              value={String(orders.length)}
              text={
                locale === "de"
                  ? "Alle bisherigen und aktuellen Bestellungen deines Firmenkontos."
                  : "All past and current orders linked to your business account."
              }
            />

            <SummaryCard
              eyebrow={locale === "de" ? "Aktiv" : "Active"}
              value={String(openCount)}
              text={
                locale === "de"
                  ? "Offene, bestätigte oder aktuell in Bearbeitung befindliche Bestellungen."
                  : "Orders that are open, confirmed or currently in preparation."
              }
            />

            <SummaryCard
              eyebrow={locale === "de" ? "Geliefert" : "Delivered"}
              value={String(deliveredCount)}
              text={
                locale === "de"
                  ? "Bereits erfolgreich ausgelieferte Bestellungen."
                  : "Orders that have already been delivered successfully."
              }
            />

            <SummaryCard
              eyebrow={locale === "de" ? "Storniert" : "Cancelled"}
              value={String(cancelledCount)}
              text={
                locale === "de"
                  ? "Bestellungen, die im Portal storniert wurden."
                  : "Orders that were cancelled in the portal."
              }
            />
          </div>
        </section>

        {orders.length === 0 ? (
          <EmptyOrders locale={locale} />
        ) : (
          <section
            style={{
              ...card.base,
              padding: "28px",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "24px",
                  color: colors.text,
                }}
              >
                {t.ordersTitle}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                {locale === "de"
                  ? "Hier findest du alle verknüpften Bestellungen inklusive Status, Betrag, Positionen und Reorder."
                  : "Here you can find all linked orders including status, amount, items and reorder."}
              </p>
            </div>

            <div style={{ display: "grid", gap: "14px" }}>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  );
}

function EmptyOrders({ locale }) {
  const title =
    locale === "en" ? "No orders yet" : "Noch keine Bestellungen";
  const text =
    locale === "en"
      ? "As soon as orders are linked to your account, they will appear here."
      : "Sobald Bestellungen mit deinem Konto verknüpft sind, erscheinen sie hier.";
  const cta =
    locale === "en" ? "Start first order" : "Erste Bestellung starten";

  return (
    <section
      style={{
        ...card.base,
        padding: "54px 24px",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "40px",
          lineHeight: 1.05,
          color: colors.text,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "0 auto 22px",
          maxWidth: "720px",
          color: colors.muted,
          lineHeight: 1.7,
          fontSize: "17px",
        }}
      >
        {text}
      </p>

      <a
        href="https://letmebowl-catering.de/pages/bestellen"
        style={{
          ...button.primary,
          textDecoration: "none",
          color: "#fff",
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #c8a96a, #b8934f)",
        }}
      >
        {cta}
      </a>
    </section>
  );
}

function OrderCard({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  const reorderableItems = (order.items || []).filter(
    (item) => item.shopifyVariantId && Number(item.quantity || 0) > 0
  );

  const hasReorderableItems = reorderableItems.length > 0;

  const reorderUrl = hasReorderableItems
    ? buildShopifyCartPermalink(reorderableItems)
    : null;

  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "20px",
        background: isCancelled ? "#fcfcfc" : "#fff",
        padding: "20px",
        display: "grid",
        gap: "16px",
        opacity: isCancelled ? 0.9 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
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
            {locale === "de" ? "Bestellung" : "Order"}
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: colors.text,
              lineHeight: 1.1,
            }}
          >
            {order.orderNumber}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 800,
              ...statusStyle,
            }}
          >
            {statusLabel}
          </span>

          {hasReorderableItems ? (
            <span style={okBadgeStyle}>
              {locale === "de" ? "Reorder möglich" : "Reorder available"}
            </span>
          ) : (
            <span style={mutedBadgeStyle}>
              {locale === "de" ? "Kein Reorder" : "No reorder"}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "12px",
        }}
      >
        <InfoBox
          label={locale === "de" ? "Datum" : "Date"}
          value={formatDate(order.createdAt, locale)}
        />
        <InfoBox
          label={locale === "de" ? "Typ" : "Type"}
          value={order.orderType || "—"}
        />
        <InfoBox
          label={locale === "de" ? "Betrag" : "Amount"}
          value={formatMoney(order.totalAmount, order.currency || "EUR", locale)}
        />
        <InfoBox
          label={locale === "de" ? "Positionen" : "Items"}
          value={String(order.items?.length || 0)}
        />
      </div>

      {(order.costCenter?.name || order.deliveryAddress?.label || order.referenceNumber) ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {order.costCenter?.name ? (
            <MetaRow
              label={locale === "de" ? "Kostenstelle" : "Cost center"}
              value={order.costCenter.name}
            />
          ) : null}

          {order.deliveryAddress?.label ? (
            <MetaRow
              label={locale === "de" ? "Lieferadresse" : "Delivery address"}
              value={order.deliveryAddress.label}
            />
          ) : null}

          {order.referenceNumber ? (
            <MetaRow
              label={locale === "de" ? "Referenz" : "Reference"}
              value={order.referenceNumber}
            />
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: colors.muted,
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {isCancelled
            ? locale === "de"
              ? "Diese Bestellung wurde im Portal storniert."
              : "This order was cancelled in the portal."
            : isDelivered
            ? locale === "de"
              ? "Geliefert. Reorder ist weiterhin möglich, falls Variant-IDs gespeichert sind."
              : "Delivered. Reorder is still possible if variant IDs were saved."
            : locale === "de"
            ? "Details öffnen, Reorder starten oder Bestellung im Detail stornieren."
            : "Open details, start reorder or cancel the order in detail view."}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href={withLang(`/bestellungen/${order.id}`, locale)}
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
            }}
          >
            {locale === "de" ? "Details" : "Details"}
          </a>

          {hasReorderableItems ? (
            <a
              href={reorderUrl}
              style={{
                ...button.primary,
                textDecoration: "none",
                color: "#fff",
                background: "linear-gradient(135deg, #c8a96a, #b8934f)",
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
              }}
            >
              {locale === "de" ? "Erneut bestellen" : "Reorder"}
            </span>
          )}
        </div>
      </div>
    </div>
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

function SummaryCard({ eyebrow, value, text }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "20px",
        background: "#fff",
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
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "34px",
          fontWeight: 800,
          color: colors.text,
          lineHeight: 1.1,
          marginBottom: "8px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: colors.muted,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "14px 16px",
        background: "#fcfbf8",
      }}
    >
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
        {label}
      </div>

      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1.4,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div
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
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1.5,
        }}
      >
        {value}
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