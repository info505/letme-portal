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
      `
        /* VIEW ONLY CLEANUP */
        .ordersPage {
          gap: 10px !important;
        }

        .ordersTop {
          padding: 14px 16px !important;
          border-radius: 12px !important;
        }

        .ordersTitle {
          font-size: 23px !important;
          line-height: 1.08 !important;
        }

        .ordersText {
          font-size: 12px !important;
          line-height: 1.35 !important;
          margin-top: 4px !important;
        }

        .statsGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }

        .statBox {
          padding: 10px 12px !important;
          border-radius: 10px !important;
        }

        .statLabel {
          font-size: 8px !important;
          margin-bottom: 4px !important;
        }

        .statValue {
          font-size: 21px !important;
        }

        .statText {
          font-size: 10.5px !important;
          margin-top: 4px !important;
        }

        .detailBox {
          padding: 12px 14px !important;
          border-width: 1px !important;
          border-radius: 12px !important;
          background: #fffdf8 !important;
        }

        .detailHead {
          margin-bottom: 8px !important;
          align-items: center !important;
        }

        .detailTitle {
          font-size: 18px !important;
          line-height: 1.1 !important;
        }

        .detailGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
          margin-bottom: 6px !important;
        }

        .detailMini {
          padding: 8px 9px !important;
          border-radius: 8px !important;
        }

        .detailLabel {
          font-size: 8px !important;
          margin-bottom: 3px !important;
        }

        .detailValue {
          font-size: 11.5px !important;
        }

        .itemRow {
          padding: 6px 0 !important;
          grid-template-columns: minmax(0, 1fr) 55px 95px !important;
          gap: 8px !important;
        }

        .listHead {
          padding: 12px 16px !important;
        }

        .listTitle {
          font-size: 18px !important;
        }

        .orderRow {
          min-height: 58px !important;
          padding: 9px 16px !important;
          grid-template-columns: minmax(220px, 1.5fr) 90px 100px 90px 50px 75px 125px !important;
          gap: 9px !important;
        }

        .orderNumber {
          font-size: 13px !important;
        }

        .orderCompany {
          font-size: 10.5px !important;
          margin-top: 2px !important;
        }

        .orderLabel {
          font-size: 7.5px !important;
          margin-bottom: 2px !important;
        }

        .orderValue {
          font-size: 11px !important;
        }

        .badge {
          min-height: 21px !important;
          padding: 0 8px !important;
          font-size: 9.5px !important;
        }

        .ordersButton {
          min-height: 30px !important;
          border-radius: 7px !important;
          font-size: 10.5px !important;
          padding: 0 9px !important;
        }

        @media (max-width: 1250px) {
          .orderRow {
            grid-template-columns: 1fr !important;
          }

          .detailGrid,
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          .detailGrid,
          .statsGrid {
            grid-template-columns: 1fr !important;
          }
        }
}</style>

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