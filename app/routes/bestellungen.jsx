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
      <style>{`
        .orders-shell {
          display: grid;
          gap: 18px;
          max-width: 1180px;
        }

        .orders-hero {
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

        .orders-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent 30%);
        }

        .orders-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
        }

        .orders-eyebrow {
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

        .orders-hero-title {
          margin: 0;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: ${colors.text};
          max-width: 760px;
        }

        .orders-hero-copy {
          margin: 14px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          line-height: 1.7;
          font-size: 15px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .summary-card {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 20px;
          background: rgba(255,255,255,0.88);
        }

        .summary-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 10px;
        }

        .summary-value {
          font-size: 34px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.1;
          margin-bottom: 8px;
        }

        .summary-text {
          font-size: 14px;
          line-height: 1.6;
          color: ${colors.muted};
        }

        .list-card {
          padding: 28px;
          border-radius: 24px;
        }

        .list-title {
          margin: 0 0 8px;
          font-size: 24px;
          color: ${colors.text};
        }

        .list-subtitle {
          margin: 0;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .orders-list {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        .order-card {
          border: 1px solid ${colors.border};
          border-radius: 20px;
          background: #fff;
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .order-card.is-cancelled {
          opacity: 0.9;
          background: #fcfcfc;
        }

        .order-head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .order-kicker {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 8px;
        }

        .order-number {
          font-size: 24px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.1;
        }

        .badge-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .info-box {
          border: 1px solid ${colors.border};
          border-radius: 16px;
          padding: 14px 16px;
          background: #fcfbf8;
        }

        .info-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 8px;
        }

        .info-value {
          font-size: 16px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.4;
          word-break: break-word;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .meta-box {
          padding: 12px 14px;
          border-radius: 14px;
          background: #f8f4ec;
          border: 1px solid #ece2d0;
        }

        .meta-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 6px;
        }

        .meta-value {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.5;
          word-break: break-word;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .order-note {
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.55;
          max-width: 640px;
        }

        .order-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .empty-card {
          padding: 54px 24px;
          text-align: center;
          border-radius: 24px;
        }

        .empty-title {
          margin: 0 0 10px;
          font-size: 40px;
          line-height: 1.05;
          color: ${colors.text};
        }

        .empty-text {
          margin: 0 auto 22px;
          max-width: 720px;
          color: ${colors.muted};
          line-height: 1.7;
          font-size: 17px;
        }

        @media (max-width: 980px) {
          .orders-hero,
          .list-card,
          .empty-card {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .summary-grid,
          .info-grid,
          .meta-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="orders-shell">
        <section className="orders-hero">
          <div className="orders-hero-grid">
            <div>
              <div className="orders-eyebrow">
                {locale === "de" ? "Bestellungen" : "Orders"}
              </div>

              <h1 className="orders-hero-title">
                {locale === "de"
                  ? "Alle Firmenbestellungen an einem Ort."
                  : "All business orders in one place."}
              </h1>

              <p className="orders-hero-copy">
                {locale === "de"
                  ? "Hier siehst du den aktuellen Status, Beträge, zugeordnete Lieferadressen und kannst frühere Bestellungen direkt erneut in den Warenkorb legen."
                  : "Here you can see current status, totals, linked delivery addresses and directly reorder previous orders into the cart."}
              </p>
            </div>

            <div className="summary-grid">
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
                    ? "Offene, bestätigte oder in Vorbereitung befindliche Bestellungen."
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
          </div>
        </section>

        {orders.length === 0 ? (
          <EmptyOrders locale={locale} />
        ) : (
          <section
            className="list-card"
            style={{
              ...card.base,
            }}
          >
            <h2 className="list-title">{t.ordersTitle}</h2>
            <p className="list-subtitle">
              {locale === "de"
                ? "Alle Bestellungen inklusive Status, Betrag, Positionen und direktem Reorder."
                : "All orders including status, amount, items and direct reorder."}
            </p>

            <div className="orders-list">
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
  const title = locale === "en" ? "No orders yet" : "Noch keine Bestellungen";
  const text =
    locale === "en"
      ? "As soon as orders are linked to your account, they will appear here."
      : "Sobald Bestellungen mit deinem Konto verknüpft sind, erscheinen sie hier.";
  const cta = locale === "en" ? "Start first order" : "Erste Bestellung starten";

  return (
    <section
      className="empty-card"
      style={{
        ...card.base,
      }}
    >
      <h3 className="empty-title">{title}</h3>
      <p className="empty-text">{text}</p>

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
    <div className={`order-card ${isCancelled ? "is-cancelled" : ""}`}>
      <div className="order-head">
        <div>
          <div className="order-kicker">
            {locale === "de" ? "Bestellung" : "Order"}
          </div>
          <div className="order-number">{order.orderNumber}</div>
        </div>

        <div className="badge-row">
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

      <div className="info-grid">
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
        <div className="meta-grid">
          {order.costCenter?.name ? (
            <MetaRow
              label={locale === "de" ? "Kostenstelle" : "Cost center"}
              value={
                order.costCenter.code
                  ? `${order.costCenter.name} · ${order.costCenter.code}`
                  : order.costCenter.name
              }
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

      <div className="order-footer">
        <div className="order-note">
          {isCancelled
            ? locale === "de"
              ? "Diese Bestellung wurde im Portal storniert."
              : "This order was cancelled in the portal."
            : isDelivered
            ? locale === "de"
              ? "Geliefert. Reorder ist weiterhin möglich, wenn Shopify-Variant-IDs gespeichert wurden."
              : "Delivered. Reorder is still possible if Shopify variant IDs were saved."
            : locale === "de"
            ? "Details öffnen, Reorder starten oder Bestellung in der Detailansicht stornieren."
            : "Open details, start reorder or cancel the order in the detail view."}
        </div>

        <div className="order-actions">
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
    <div className="summary-card">
      <div className="summary-label">{eyebrow}</div>
      <div className="summary-value">{value}</div>
      <div className="summary-text">{text}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="info-box">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="meta-box">
      <div className="meta-label">{label}</div>
      <div className="meta-value">{value}</div>
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