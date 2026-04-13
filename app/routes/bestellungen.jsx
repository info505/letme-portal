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
    where: {
      userId: user.id,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { user, locale, orders };
}

export default function BestellungenPage() {
  const { locale, orders } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout title={t.ordersTitle} subtitle={t.ordersText}>
      <section
        style={{
          ...card.base,
          padding: "20px",
          overflowX: "auto",
          marginBottom: "24px",
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
                fontWeight: 700,
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

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <ActionCard
          title={t.reorderTitle}
          text={t.reorderText}
          href="https://letmebowl-catering.de"
          cta={t.startOrder}
          primary
        />

        <ActionCard
          title={t.invoices}
          text={t.invoicesText}
          href={withLang("/rechnungen", locale)}
          cta={t.openInvoices}
        />

        <ActionCard
          title={t.addresses}
          text={t.addressesText}
          href={withLang("/adressen", locale)}
          cta={t.openAddresses}
        />
      </section>

      <section
        style={{
          ...card.base,
          padding: "28px",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: "24px",
            color: colors.text,
          }}
        >
          {t.quickLinks}
        </h3>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <a
            href={withLang("/dashboard", locale)}
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
              fontWeight: 700,
            }}
          >
            {t.account}
          </a>

          <a
            href={withLang("/rechnungen", locale)}
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
              fontWeight: 700,
            }}
          >
            {t.invoices}
          </a>

          <a
            href="https://letmebowl-catering.de"
            style={{
              ...button.primary,
              textDecoration: "none",
              color: "#fff",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.orderNow}
          </a>
        </div>
      </section>
    </PortalLayout>
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
      <div style={{ fontWeight: 600 }}>
        {order.orderNumber}
      </div>

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
            fontWeight: 700,
            ...statusStyle,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div style={{ fontWeight: 600 }}>
        {formatMoney(order.totalAmount, order.currency || "EUR", locale)}
      </div>

      <div>{order.items?.length || 0}</div>
    </div>
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
        padding: "34px 20px",
        textAlign: "center",
      }}
    >
      <h3
        style={{
          margin: "0 0 10px",
          fontSize: "24px",
          color: colors.text,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "0 auto 18px",
          maxWidth: "620px",
          color: colors.muted,
          lineHeight: 1.6,
          fontSize: "15px",
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
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cta}
      </a>
    </div>
  );
}

function ActionCard({ title, text, href, cta, primary = false }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "220px",
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "22px",
            color: colors.text,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: colors.muted,
            lineHeight: 1.6,
            fontSize: "15px",
          }}
        >
          {text}
        </p>
      </div>

      <div style={{ marginTop: "22px" }}>
        <a
          href={href}
          style={{
            ...(primary ? button.primary : button.secondary),
            textDecoration: "none",
            color: primary ? "#fff" : colors.text,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {cta}
        </a>
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
  const num = typeof value === "object" && value !== null && "toNumber" in value
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
    case "open":
    default:
      return {
        background: "#f3f3f3",
        color: "#555",
        border: "1px solid #dfdfdf",
      };
  }
}