import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, withLang } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const sessionUser = await getUserFromRequest(request);

  if (!sessionUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      invoicePurchaseEnabled: true,
      isAdmin: true,
    },
  });

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const orders = await prisma.portalOrder.findMany({
    where: { userId: user.id },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    locale,
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      companyName: order.companyName,
      billingCompanyName: order.billingCompanyName,
      status: order.status,
      currency: order.currency || "EUR",
      totalAmount: order.totalAmount ? order.totalAmount.toString() : "0",
      createdAt: order.createdAt ? order.createdAt.toISOString() : null,
      deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
      items: (order.items || []).map((item) => ({
        id: item.id,
        shopifyVariantId: item.shopifyVariantId,
      })),
    })),
  };
}

export default function BestellungenPage() {
  const { locale, orders } = useLoaderData();

  const activeOrders = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  );

  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED");

  const totalAmount = orders.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  return (
    <PortalLayout
      title={locale === "en" ? "Orders" : "Bestellungen"}
      subtitle={
        locale === "en"
          ? "Review your company orders and delivery status."
          : "Prüfe deine Firmenbestellungen und den Lieferstatus."
      }
    >
      <style>{`
        .ordersPage {
          display: grid;
          gap: 14px;
          width: 100%;
        }

        .ordersTop,
        .ordersPanel,
        .ordersStat {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        }

        .ordersTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px;
          border-radius: 14px;
        }

        .ordersKicker {
          margin-bottom: 6px;
          color: #a97d2f;
          font-size: 9.5px;
          font-weight: 850;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .ordersTopTitle {
          margin: 0;
          color: #17191c;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.12;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .ordersTopText {
          margin: 7px 0 0;
          color: #667085;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 500;
        }

        .ordersTopActions {
          display: flex;
          gap: 9px;
          flex-shrink: 0;
        }

        .ordersButton {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 13px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: #ffffff;
          color: #17191c;
          font-size: 12px;
          line-height: 1;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
        }

        .ordersButtonPrimary {
          border-color: #a97d2f;
          background: #a97d2f;
          color: #ffffff;
        }

        .ordersStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .ordersStat {
          min-width: 0;
          padding: 14px 15px;
          border-radius: 12px;
        }

        .ordersStatLabel {
          margin-bottom: 6px;
          color: #667085;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ordersStatValue {
          color: #17191c;
          font-size: 25px;
          line-height: 1.05;
          font-weight: 900;
        }

        .ordersStatText {
          margin-top: 6px;
          color: #667085;
          font-size: 11.5px;
          line-height: 1.4;
          font-weight: 500;
        }

        .ordersPanel {
          overflow: hidden;
          border-radius: 14px;
        }

        .ordersPanelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 17px 18px;
          border-bottom: 1px solid #eaecf0;
        }

        .ordersPanelTitle {
          margin: 0;
          color: #17191c;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .ordersPanelText {
          margin: 5px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        }

        .ordersList {
          display: grid;
        }

        .orderRow {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(0, 1.4fr) 170px;
          gap: 16px;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid #f0f2f4;
          background: #ffffff;
        }

        .orderRow:last-child {
          border-bottom: 0;
        }

        .orderNumber {
          color: #17191c;
          font-size: 14.5px;
          line-height: 1.2;
          font-weight: 900;
        }

        .orderCompany {
          margin-top: 3px;
          color: #667085;
          font-size: 11.5px;
          line-height: 1.3;
          font-weight: 500;
        }

        .orderBadges {
          display: flex;
          gap: 6px;
          margin-top: 7px;
          flex-wrap: wrap;
        }

        .badge {
          min-height: 25px;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 850;
          white-space: nowrap;
        }

        .badgeStatus {
          background: #f3f4f6;
          color: #344054;
          border: 1px solid #e5e7eb;
        }

        .badgeReorder {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .badgeMuted {
          background: #f3f4f6;
          color: #667085;
          border: 1px solid #e5e7eb;
        }

        .orderMeta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .orderMetaBox {
          min-width: 0;
          padding: 10px;
          border-radius: 9px;
          border: 1px solid #eaecf0;
          background: #f8fafc;
        }

        .orderMetaLabel {
          margin-bottom: 4px;
          color: #667085;
          font-size: 8.5px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .orderMetaValue {
          color: #17191c;
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }

        .orderActions {
          display: grid;
          gap: 7px;
        }

        .orderActions .ordersButton {
          width: 100%;
          min-height: 34px;
          font-size: 11.5px;
        }

        .emptyOrders {
          padding: 34px 18px;
          text-align: center;
          background: #f8fafc;
        }

        @media (max-width: 1250px) {
          .orderRow {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .orderActions {
            width: fit-content;
            min-width: 170px;
          }
        }

        @media (max-width: 900px) {
          .ordersTop,
          .ordersPanelHead {
            display: grid;
          }

          .ordersStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .ordersStats,
          .orderMeta {
            grid-template-columns: 1fr;
          }

          .ordersTopActions,
          .orderActions,
          .ordersButton {
            width: 100%;
          }
        }
      `}</style>

      <div className="ordersPage">
        <section className="ordersTop">
          <div>
            <div className="ordersKicker">
              {locale === "en" ? "Order overview" : "Bestellübersicht"}
            </div>
            <h2 className="ordersTopTitle">
              {locale === "en" ? "Company orders in one place." : "Firmenbestellungen an einem Ort."}
            </h2>
            <p className="ordersTopText">
              {locale === "en"
                ? "Review status, delivery dates, amounts and details."
                : "Prüfe Status, Liefertermine, Beträge und Details."}
            </p>
          </div>

          <div className="ordersTopActions">
            <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersButton ordersButtonPrimary">
              {locale === "en" ? "Start new order" : "Neue Bestellung starten"}
            </a>
            <a href={withLang("/dashboard", locale)} className="ordersButton">
              Dashboard
            </a>
          </div>
        </section>

        <section className="ordersStats">
          <StatCard label={locale === "en" ? "Orders total" : "Bestellungen gesamt"} value={String(orders.length)} text={locale === "en" ? "All linked orders." : "Alle verknüpften Firmenbestellungen."} />
          <StatCard label={locale === "en" ? "Active" : "Aktiv"} value={String(activeOrders.length)} text={locale === "en" ? "Open or in preparation." : "Offen, bestätigt oder in Vorbereitung."} />
          <StatCard label={locale === "en" ? "Delivered" : "Geliefert"} value={String(deliveredOrders.length)} text={locale === "en" ? "Completed orders." : "Erfolgreich abgeschlossene Bestellungen."} />
          <StatCard label={locale === "en" ? "Total value" : "Gesamtwert"} value={formatMoney(totalAmount, "EUR", locale)} text={locale === "en" ? "Sum of all orders." : "Summe aller verknüpften Bestellungen."} />
        </section>

        <section className="ordersPanel">
          <div className="ordersPanelHead">
            <div>
              <h3 className="ordersPanelTitle">
                {locale === "en" ? "Your orders" : "Deine Bestellungen"}
              </h3>
              <p className="ordersPanelText">
                {locale === "en" ? "Sorted by latest order first." : "Sortiert nach der neuesten Bestellung zuerst."}
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <section className="emptyOrders">
              {locale === "en" ? "No orders yet." : "Noch keine Bestellungen."}
            </section>
          ) : (
            <div className="ordersList">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function StatCard({ label, value, text }) {
  return (
    <div className="ordersStat">
      <div className="ordersStatLabel">{label}</div>
      <div className="ordersStatValue">{value}</div>
      <div className="ordersStatText">{text}</div>
    </div>
  );
}

function OrderRow({ order, locale }) {
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const hasReorder = Array.isArray(order.items)
    ? order.items.some((item) => item.shopifyVariantId)
    : false;

  return (
    <article className="orderRow">
      <div>
        <div className="orderNumber">{order.orderNumber || "—"}</div>
        <div className="orderCompany">
          {order.billingCompanyName || order.companyName || (locale === "en" ? "Company order" : "Firmenbestellung")}
        </div>

        <div className="orderBadges">
          <span className="badge badgeStatus">{getStatusLabel(order.status, locale)}</span>
          <span className={`badge ${hasReorder ? "badgeReorder" : "badgeMuted"}`}>
            {hasReorder ? (locale === "en" ? "Reorder possible" : "Reorder möglich") : (locale === "en" ? "No reorder" : "Kein Reorder")}
          </span>
        </div>
      </div>

      <div className="orderMeta">
        <Meta label={locale === "en" ? "Created" : "Erstellt"} value={formatDate(order.createdAt, locale)} />
        <Meta label={locale === "en" ? "Delivery" : "Lieferdatum"} value={formatDate(order.deliveryDate, locale)} />
        <Meta label={locale === "en" ? "Amount" : "Betrag"} value={formatMoney(order.totalAmount, order.currency, locale)} />
        <Meta label={locale === "en" ? "Items" : "Positionen"} value={String(itemCount)} />
      </div>

      <div className="orderActions">
        <a href={withLang(`/bestellungen/${order.id}`, locale)} className="ordersButton">
          Details
        </a>
        <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersButton ordersButtonPrimary">
          {locale === "en" ? "Order again" : "Erneut bestellen"}
        </a>
      </div>
    </article>
  );
}

function Meta({ label, value }) {
  return (
    <div className="orderMetaBox">
      <div className="orderMetaLabel">{label}</div>
      <div className="orderMetaValue">{value || "—"}</div>
    </div>
  );
}

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value, currency = "EUR", locale = "de") {
  const num = Number(value || 0);
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency: currency || "EUR",
  }).format(Number.isNaN(num) ? 0 : num);
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