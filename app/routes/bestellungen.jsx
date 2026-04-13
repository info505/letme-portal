import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
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
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return { locale, orders };
}

export default function BestellungenPage() {
  const { locale, orders } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout title={t.ordersTitle} subtitle={t.ordersText}>
      <section
        style={{
          ...card.base,
          padding: "22px",
          overflowX: "auto",
        }}
      >
        {orders.length === 0 ? (
          <EmptyOrders locale={locale} />
        ) : (
          <div style={{ minWidth: "860px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr",
                gap: "16px",
                padding: "14px 16px",
                borderBottom: `1px solid ${colors.border}`,
                color: colors.muted,
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <div>{t.orderNumber}</div>
              <div>{t.date}</div>
              <div>{t.orderType}</div>
              <div>{t.status}</div>
              <div>{t.amount}</div>
              <div>{t.positions}</div>
            </div>

            {orders.map((order) => (
              <OrderRow key={order.id} order={order} locale={locale} />
            ))}
          </div>
        )}
      </section>
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
    <div
      style={{
        padding: "54px 24px",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "42px",
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
          fontSize: "18px",
        }}
      >
        {text}
      </p>

      <a
        href="https://letmebowl-catering.de"
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
    </div>
  );
}

function OrderRow({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1fr",
        gap: "16px",
        padding: "16px",
        borderBottom: `1px solid ${colors.border}`,
        alignItems: "center",
        color: colors.text,
        fontSize: "15px",
      }}
    >
      <div style={{ fontWeight: 700 }}>{order.orderNumber}</div>
      <div>{formatDate(order.createdAt, locale)}</div>
      <div>{order.orderType || "—"}</div>
      <div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: 800,
            ...statusStyle,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div style={{ fontWeight: 700 }}>
        {formatMoney(order.totalAmount, order.currency || "EUR", locale)}
      </div>
      <div>{order.items?.length || 0}</div>
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
    open: locale === "en" ? "Open" : "Offen",
    confirmed: locale === "en" ? "Confirmed" : "Bestätigt",
    in_preparation: locale === "en" ? "In preparation" : "In Vorbereitung",
    delivered: locale === "en" ? "Delivered" : "Geliefert",
    cancelled: locale === "en" ? "Cancelled" : "Storniert",
  };

  return map[status] || status || "—";
}

function getStatusStyle(status) {
  switch (status) {
    case "delivered":
      return {
        background: "#edf7ee",
        color: "#1f6b36",
        border: "1px solid #cfe8d4",
      };
    case "confirmed":
      return {
        background: "#eef4ff",
        color: "#285ea8",
        border: "1px solid #cfddf6",
      };
    case "in_preparation":
      return {
        background: "#fff6e9",
        color: "#8a5a00",
        border: "1px solid #f0dfbf",
      };
    case "cancelled":
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