import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const sessionUser = await getUserFromRequest(request);

  if (!sessionUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  const url = new URL(request.url);
  const detailId = url.searchParams.get("detail") || "";

  const ordersRaw = await prisma.portalOrder.findMany({
    where: { userId: sessionUser.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const orders = ordersRaw.map((order) => ({
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
      title: item.title || item.productTitle || item.name || "Position",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice ? item.unitPrice.toString() : "0",
      totalPrice: item.totalPrice ? item.totalPrice.toString() : "0",
      shopifyVariantId: item.shopifyVariantId,
    })),
  }));

  const selectedOrder =
    orders.find((order) => order.id === detailId || order.orderNumber === detailId) || null;

  return { locale, orders, selectedOrder, detailId };
}

export default function BestellungenPage() {
  const { locale, orders, selectedOrder, detailId } = useLoaderData();

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
          ? "Review company orders and delivery status."
          : "Prüfe Firmenbestellungen und Lieferstatus."
      }
    >
      <style>{`
        .ordersPage {
          width: 100%;
          display: grid;
          gap: 14px;
        }

        .ordersCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          overflow: hidden;
        }

        .ordersTop {
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .ordersKicker {
          color: #a97d2f;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .ordersTitle {
          margin: 0;
          color: #17191c;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .ordersText {
          margin: 7px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
        }

        .ordersButton {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: #ffffff;
          color: #17191c;
          font-size: 12px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .ordersButtonPrimary {
          border-color: #a97d2f;
          background: #a97d2f;
          color: #ffffff;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .statBox {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .statLabel {
          margin-bottom: 5px;
          color: #667085;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .statValue {
          color: #17191c;
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
        }

        .statText {
          margin-top: 6px;
          color: #667085;
          font-size: 11.5px;
        }

        .detailBox {
          padding: 18px;
          border-radius: 14px;
          border: 2px solid #a97d2f;
          background: #fffaf1;
        }

        .detailHead {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .detailTitle {
          margin: 0;
          color: #17191c;
          font-size: 22px;
          font-weight: 900;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .detailMini {
          padding: 10px;
          border-radius: 9px;
          border: 1px solid #eadbc1;
          background: #ffffff;
        }

        .detailLabel {
          color: #667085;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .detailValue {
          color: #17191c;
          font-size: 12.5px;
          font-weight: 850;
        }

        .listHead {
          padding: 16px 18px;
          border-bottom: 1px solid #eaecf0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }

        .listTitle {
          margin: 0;
          color: #17191c;
          font-size: 20px;
          font-weight: 900;
        }

        .orderRow {
          display: grid;
          grid-template-columns: minmax(220px, 1.2fr) 110px 120px 110px 80px 115px 145px;
          gap: 12px;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #f0f2f4;
          background: #ffffff;
        }

        .orderRow:last-child {
          border-bottom: 0;
        }

        .orderNumber {
          color: #17191c;
          font-size: 14px;
          font-weight: 900;
        }

        .orderCompany {
          margin-top: 3px;
          color: #667085;
          font-size: 11.5px;
        }

        .orderLabel {
          color: #667085;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .orderValue {
          color: #17191c;
          font-size: 12px;
          font-weight: 850;
        }

        .badge {
          width: fit-content;
          min-height: 25px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 850;
          background: #f3f4f6;
          color: #344054;
          border: 1px solid #e5e7eb;
        }

        .itemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 80px 110px;
          gap: 10px;
          padding: 10px 0;
          border-top: 1px solid #eadbc1;
        }

        @media (max-width: 1250px) {
          .orderRow {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .detailGrid,
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .ordersTop,
          .detailHead,
          .listHead {
            display: grid;
          }

          .detailGrid,
          .statsGrid {
            grid-template-columns: 1fr;
          }
        }

        /* COMPACT BUSINESS ORDERS VIEW */
        .ordersPage {
          gap: 10px;
        }

        .ordersTop {
          padding: 16px 18px;
          border-radius: 14px;
          min-height: unset;
        }

        .ordersTitle {
          font-size: 21px;
          line-height: 1.15;
          margin-bottom: 4px;
        }

        .ordersText {
          font-size: 12px;
          line-height: 1.35;
          margin: 0;
        }

        .statsGrid {
          gap: 10px;
        }

        .statCard {
          padding: 12px 14px;
          border-radius: 12px;
          min-height: unset;
        }

        .statValue {
          font-size: 22px;
          line-height: 1.1;
        }

        .statText {
          font-size: 11px;
          margin-top: 4px;
        }

        .listHead {
          padding: 12px 16px;
          border-bottom: 1px solid #edf0f2;
        }

        .listTitle {
          font-size: 18px;
          line-height: 1.15;
        }

        .ordersList {
          border-radius: 14px;
          overflow: hidden;
        }

        .orderRow {
          min-height: unset;
          padding: 12px 16px;
          grid-template-columns: minmax(260px, 1.5fr) 92px 104px 92px 50px 74px 126px;
          gap: 10px;
          align-items: center;
          border-bottom: 1px solid #edf0f2;
          background: #fff;
        }

        .orderRow:hover {
          background: #fffaf1;
        }

        .orderNumber {
          font-size: 13px;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .orderCompany {
          font-size: 11px;
          line-height: 1.25;
          margin-top: 3px;
          color: #607083;
        }

        .orderLabel {
          font-size: 8px;
          line-height: 1;
          margin-bottom: 4px;
          letter-spacing: 0.08em;
          color: #707b88;
        }

        .orderValue {
          font-size: 11px;
          line-height: 1.15;
        }

        .badge {
          min-height: 22px;
          padding: 0 8px;
          font-size: 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .ordersButton {
          min-height: 31px;
          border-radius: 8px;
          font-size: 10.5px;
          padding: 0 10px;
          width: 100%;
        }

        .detailBox {
          padding: 14px 16px;
          border: 1px solid #e5dccd;
          border-radius: 14px;
          background: #fffdf8;
          box-shadow: 0 10px 28px rgba(20, 18, 15, 0.06);
        }

        .detailHead {
          margin-bottom: 10px;
          align-items: center;
        }

        .detailTitle {
          font-size: 18px;
          line-height: 1.15;
        }

        .detailGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .detailMini {
          padding: 9px 10px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid #eee4d5;
        }

        .detailLabel {
          font-size: 8px;
          margin-bottom: 3px;
        }

        .detailValue {
          font-size: 11.5px;
        }

        .itemRow {
          padding: 7px 0;
          grid-template-columns: minmax(0, 1fr) 55px 95px;
          gap: 8px;
        }

        @media (max-width: 1250px) {
          .orderRow {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .detailGrid,
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .detailGrid,
          .statsGrid {
            grid-template-columns: 1fr;
          }
        }

        /* DENSE ORDERS BUSINESS VIEW */
        .ordersPage {
          gap: 8px;
        }

        .ordersTop {
          padding: 12px 16px;
          border-radius: 12px;
        }

        .ordersTop .ordersButton,
        .ordersTop a.ordersButton {
          min-height: 28px;
        }

        .ordersTitle {
          font-size: 20px;
          line-height: 1.1;
          margin: 0 0 3px;
        }

        .ordersText {
          font-size: 11px;
          line-height: 1.25;
          margin: 0;
        }

        .statsGrid {
          gap: 8px;
        }

        .statCard {
          padding: 10px 12px;
          min-height: 58px;
          border-radius: 10px;
        }

        .statLabel {
          font-size: 7.5px;
          margin-bottom: 3px;
        }

        .statValue {
          font-size: 20px;
          line-height: 1;
        }

        .statText {
          font-size: 10px;
          margin-top: 3px;
        }

        .ordersList {
          border-radius: 12px;
          overflow: hidden;
        }

        .listHead {
          padding: 10px 14px;
        }

        .listTitle {
          font-size: 17px;
          line-height: 1.1;
          margin: 0 0 2px;
        }

        .orderRow {
          min-height: 54px;
          padding: 7px 14px;
          grid-template-columns: minmax(250px, 1.7fr) 88px 100px 88px 44px 66px 112px;
          gap: 8px;
          align-items: center;
          border-bottom: 1px solid #edf0f2;
        }

        .orderRow > div {
          min-width: 0;
        }

        .orderNumber {
          font-size: 12.5px;
          line-height: 1.05;
        }

        .orderCompany {
          font-size: 10.5px;
          line-height: 1.15;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 260px;
        }

        .orderLabel {
          font-size: 7px;
          line-height: 1;
          margin-bottom: 3px;
        }

        .orderValue {
          font-size: 10.5px;
          line-height: 1.1;
        }

        .badge {
          min-height: 19px;
          padding: 0 7px;
          font-size: 9px;
        }

        .ordersButton {
          min-height: 27px;
          padding: 0 8px;
          border-radius: 7px;
          font-size: 10px;
          width: 100%;
        }

        .orderRow .ordersButton + .ordersButton,
        .orderRow a + a {
          margin-top: 4px;
        }

        .detailBox {
          padding: 12px 14px;
          border-radius: 12px;
        }

        .detailHead {
          margin-bottom: 8px;
        }

        .detailTitle {
          font-size: 17px;
          line-height: 1.1;
        }

        .detailGrid {
          gap: 7px;
          margin-bottom: 7px;
        }

        .detailMini {
          padding: 8px 9px;
          border-radius: 8px;
        }

        .detailLabel {
          font-size: 7.5px;
          margin-bottom: 2px;
        }

        .detailValue {
          font-size: 11px;
        }

        .itemRow {
          padding: 6px 0;
          grid-template-columns: minmax(0, 1fr) 48px 82px;
          gap: 7px;
        }

        @media (max-width: 1250px) {
          .orderRow {
            grid-template-columns: 1fr;
            padding: 10px 14px;
          }
        }

      `}</style>

      <div className="ordersPage">
        <section className="ordersCard ordersTop">
          <div>
            <div className="ordersKicker">Bestellübersicht</div>
            <h2 className="ordersTitle">Firmenbestellungen</h2>
            <p className="ordersText">
              Details öffnen sich jetzt direkt hier in der Übersicht.
            </p>
          </div>

          <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersButton ordersButtonPrimary">
            Neue Bestellung starten
          </a>
        </section>

        <section className="statsGrid">
          <Stat label="Bestellungen" value={orders.length} text="Alle Bestellungen" />
          <Stat label="Aktiv" value={activeOrders.length} text="Offen oder in Vorbereitung" />
          <Stat label="Geliefert" value={deliveredOrders.length} text="Abgeschlossen" />
          <Stat label="Gesamtwert" value={formatMoney(totalAmount, "EUR", locale)} text="Summe aller Bestellungen" />
        </section>

        {detailId && !selectedOrder ? (
          <section className="detailBox">
            <div className="detailHead">
              <div>
                <h3 className="detailTitle">Detail angefragt, aber nicht gefunden</h3>
                <p className="ordersText">Gesuchte ID: {detailId}</p>
              </div>
              <a href={`/bestellungen?lang=${locale}`} className="ordersButton">Schließen</a>
            </div>
          </section>
        ) : null}

        {selectedOrder ? (
          <section className="detailBox">
            <div className="detailHead">
              <div>
                <div className="ordersKicker">Bestelldetails</div>
                <h3 className="detailTitle">{selectedOrder.orderNumber || selectedOrder.id}</h3>
                <p className="ordersText">
                  {selectedOrder.billingCompanyName || selectedOrder.companyName || "Firmenbestellung"}
                </p>
              </div>

              <a href={`/bestellungen?lang=${locale}`} className="ordersButton">Schließen</a>
            </div>

            <div className="detailGrid">
              <Mini label="Status" value={getStatusLabel(selectedOrder.status)} />
              <Mini label="Erstellt" value={formatDate(selectedOrder.createdAt, locale)} />
              <Mini label="Lieferdatum" value={formatDate(selectedOrder.deliveryDate, locale)} />
              <Mini label="Gesamt" value={formatMoney(selectedOrder.totalAmount, selectedOrder.currency, locale)} />
            </div>

            {selectedOrder.items.length === 0 ? (
              <div className="ordersText">Keine Positionen gespeichert.</div>
            ) : (
              selectedOrder.items.map((item) => (
                <div className="itemRow" key={item.id}>
                  <div className="orderValue">{item.title}</div>
                  <div className="orderValue">x {item.quantity}</div>
                  <div className="orderValue">{formatMoney(item.totalPrice, selectedOrder.currency, locale)}</div>
                </div>
              ))
            )}
          </section>
        ) : null}

        <section className="ordersCard">
          <div className="listHead">
            <div>
              <h3 className="listTitle">Deine Bestellungen</h3>
              <p className="ordersText">Sortiert nach der neuesten Bestellung zuerst.</p>
            </div>
          </div>

          {orders.map((order) => (
            <article className="orderRow" key={order.id}>
              <div>
                <div className="orderNumber">{order.orderNumber || "—"}</div>
                <div className="orderCompany">
                  {order.billingCompanyName || order.companyName || "Firmenbestellung"}
                </div>
              </div>

              <Cell label="Erstellt" value={formatDate(order.createdAt, locale)} />
              <Cell label="Lieferdatum" value={formatDate(order.deliveryDate, locale)} />
              <Cell label="Betrag" value={formatMoney(order.totalAmount, order.currency, locale)} />
              <Cell label="Pos." value={String(order.items.length)} />

              <div>
                <span className="badge">{getStatusLabel(order.status)}</span>
              </div>

              <div style={{ display: "grid", gap: 7 }}>
                <a href={`/bestellungen?detail=${encodeURIComponent(order.id)}&lang=${locale}`} className="ordersButton">
                  Details
                </a>
                <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersButton ordersButtonPrimary">
                  Erneut bestellen
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </PortalLayout>
  );
}

function Stat({ label, value, text }) {
  return (
    <div className="statBox">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
      <div className="statText">{text}</div>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <div className="orderLabel">{label}</div>
      <div className="orderValue">{value}</div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="detailMini">
      <div className="detailLabel">{label}</div>
      <div className="detailValue">{value || "—"}</div>
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

function getStatusLabel(status) {
  const map = {
    OPEN: "Offen",
    CONFIRMED: "Bestätigt",
    IN_PREPARATION: "In Vorbereitung",
    DELIVERED: "Geliefert",
    CANCELLED: "Storniert",
  };

  return map[status] || status || "—";
}