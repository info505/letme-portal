import { Fragment, useState } from "react";
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

  return { locale, orders, detailId };
}

export default function BestellungenPage() {
  const { locale, orders, detailId } = useLoaderData();
  const [openOrderId, setOpenOrderId] = useState(detailId || "");

  const activeOrders = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  );

  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED");

  const totalAmount = orders.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  function toggleDetails(orderId) {
    setOpenOrderId((current) => (current === orderId ? "" : orderId));
  }

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
          height: calc(100vh - 118px);
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
        }

        .ordersIntro {
          flex: 0 0 auto;
          background: #ffffff;
          border: 1px solid #e7e5df;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.035);
        }

        .ordersKicker {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #234c30;
          margin-bottom: 4px;
        }

        .ordersTitle {
          margin: 0;
          color: #17281d;
          font-size: 24px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .ordersText {
          margin: 4px 0 0;
          color: #727a73;
          font-size: 12.5px;
          line-height: 1.35;
          font-weight: 600;
        }

        .ordersButton {
          min-height: 32px;
          padding: 0 13px;
          border-radius: 9px;
          border: 1px solid #cfd5c9;
          background: #ffffff;
          color: #17281d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .ordersButtonPrimary {
          border-color: #234c30;
          background: #234c30;
          color: #ffffff;
        }

        .statsGrid {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e7e5df;
          border-radius: 14px;
          padding: 13px 15px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.025);
        }

        .statLabel {
          color: #727a73;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .statValue {
          color: #17281d;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .statText {
          margin-top: 5px;
          color: #727a73;
          font-size: 11.5px;
          font-weight: 600;
        }

        .ordersPanel {
          flex: 1 1 auto;
          min-height: 0;
          background: #ffffff;
          border: 1px solid #e7e5df;
          border-radius: 16px;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.035);
        }

        .ordersPanelHead {
          position: sticky;
          top: 0;
          z-index: 5;
          background: #ffffff;
          padding: 15px 17px;
          border-bottom: 1px solid #f2f4e9;
        }

        .ordersPanelTitle {
          margin: 0;
          color: #17281d;
          font-size: 20px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .ordersPanelSub {
          margin: 3px 0 0;
          color: #727a73;
          font-size: 12px;
          font-weight: 600;
        }

        .ordersHeader,
        .orderMain {
          display: grid;
          grid-template-columns: minmax(170px, 1.15fr) minmax(230px, 1.55fr) 100px 112px 96px 54px 78px 124px;
          gap: 12px;
          align-items: center;
        }

        .ordersHeader {
          position: sticky;
          top: 64px;
          z-index: 4;
          min-height: 38px;
          padding: 0 17px;
          background: #fdfcf9;
          border-bottom: 1px solid #f2f4e9;
          color: #727a73;
          font-size: 8.5px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .orderBlock {
          border-bottom: 1px solid #f2f4e9;
          background: #ffffff;
        }

        .orderBlock:last-child {
          border-bottom: 0;
        }

        .orderMain {
          min-height: 64px;
          padding: 10px 17px;
        }

        .orderBlock:hover .orderMain {
          background: #fffaf1;
        }

        .orderCell {
          min-width: 0;
        }

        .orderNumber {
          color: #17281d;
          font-size: 14px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .orderCompany {
          color: #3e4640;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orderValue {
          color: #17281d;
          font-size: 11.5px;
          line-height: 1.2;
          font-weight: 850;
          white-space: nowrap;
        }

        .statusBadge {
          min-height: 22px;
          padding: 0 8px;
          border-radius: 999px;
          background: #fdfcf9;
          border: 1px solid #e7e5df;
          color: #17281d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9.5px;
          font-weight: 900;
          white-space: nowrap;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .actions .ordersButton {
          width: 100%;
          min-height: 30px;
          font-size: 10.5px;
          padding: 0 8px;
        }

        .detailsPanel {
          margin: 0 17px 13px;
          padding: 14px;
          border: 1px solid #e7e5df;
          border-radius: 14px;
          background: #fdfcf9;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }

        .detailsTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 11px;
        }

        .detailsTitle {
          margin: 0;
          color: #17281d;
          font-size: 17px;
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }

        .detailMini {
          border: 1px solid #f2f4e9;
          background: #ffffff;
          border-radius: 11px;
          padding: 10px;
        }

        .detailLabel {
          color: #727a73;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .detailValue {
          color: #17281d;
          font-size: 11.5px;
          font-weight: 850;
          line-height: 1.15;
        }

        .itemsList {
          border-top: 1px solid #f2f4e9;
        }

        .itemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 54px 92px;
          gap: 10px;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f2f4e9;
        }

        .itemRow:last-child {
          border-bottom: 0;
        }

        .itemTitle {
          color: #3e4640;
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1.25;
        }

        .emptyState {
          padding: 28px 16px;
          text-align: center;
          color: #727a73;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 1250px) {
          .ordersPage {
            height: auto;
            overflow: visible;
          }

          .ordersPanel {
            overflow: visible;
          }

          .ordersHeader {
            display: none;
          }

          .orderMain {
            grid-template-columns: 1fr;
            gap: 8px;
            align-items: start;
            padding: 12px 17px;
          }

          .orderCell::before {
            content: attr(data-label);
            display: block;
            color: #727a73;
            font-size: 8px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 3px;
          }

          .actions {
            grid-template-columns: 1fr 1fr;
          }

          .statsGrid,
          .detailsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .ordersIntro,
          .detailsTop {
            display: grid;
          }

          .statsGrid,
          .detailsGrid {
            grid-template-columns: 1fr;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }

      `}</style>

      <div className="ordersPage">
        <section className="ordersIntro">
          <div>
            <div className="ordersKicker">Bestellübersicht</div>
            <h2 className="ordersTitle">Firmenbestellungen</h2>
            <p className="ordersText">Alle Bestellungen kompakt und sauber auf einen Blick.</p>
          </div>

          <a
            href="https://letmebowl-catering.de/pages/bestellen"
            className="ordersButton ordersButtonPrimary"
          >
            Neue Bestellung starten
          </a>
        </section>

        <section className="statsGrid">
          <Stat label="Bestellungen" value={orders.length} text="Alle Bestellungen" />
          <Stat label="Aktiv" value={activeOrders.length} text="Offen oder in Vorbereitung" />
          <Stat label="Geliefert" value={deliveredOrders.length} text="Abgeschlossen" />
          <Stat
            label="Gesamtwert"
            value={formatMoney(totalAmount, "EUR", locale)}
            text="Summe aller Bestellungen"
          />
        </section>

        <section className="ordersPanel">
          <div className="ordersPanelHead">
            <h3 className="ordersPanelTitle">Deine Bestellungen</h3>
            <p className="ordersPanelSub">Details öffnen direkt unter der jeweiligen Bestellung.</p>
          </div>

          {orders.length === 0 ? (
            <div className="emptyState">Noch keine Bestellungen vorhanden.</div>
          ) : (
            <>
              <div className="ordersHeader">
                <div>Bestellung</div>
                <div>Firma</div>
                <div>Erstellt</div>
                <div>Lieferdatum</div>
                <div>Betrag</div>
                <div>Pos.</div>
                <div>Status</div>
                <div>Aktionen</div>
              </div>

              {orders.map((order) => {
                const isOpen = openOrderId === order.id;

                return (
                  <Fragment key={order.id}>
                    <article className="orderBlock">
                      <div className="orderMain">
                        <div className="orderCell" data-label="Bestellung">
                          <div className="orderNumber">{order.orderNumber || "—"}</div>
                        </div>

                        <div className="orderCell" data-label="Firma">
                          <div className="orderCompany">
                            {decodeText(order.billingCompanyName || order.companyName || "Firmenbestellung")}
                          </div>
                        </div>

                        <div className="orderCell" data-label="Erstellt">
                          <div className="orderValue">{formatDate(order.createdAt, locale)}</div>
                        </div>

                        <div className="orderCell" data-label="Lieferdatum">
                          <div className="orderValue">{formatDate(order.deliveryDate, locale)}</div>
                        </div>

                        <div className="orderCell" data-label="Betrag">
                          <div className="orderValue">
                            {formatMoney(order.totalAmount, order.currency, locale)}
                          </div>
                        </div>

                        <div className="orderCell" data-label="Pos.">
                          <div className="orderValue">{order.items.length}</div>
                        </div>

                        <div className="orderCell" data-label="Status">
                          <span className="statusBadge">{getStatusLabel(order.status)}</span>
                        </div>

                        <div className="actions">
                          <button
                            type="button"
                            className="ordersButton"
                            onClick={() => toggleDetails(order.id)}
                          >
                            {isOpen ? "Schließen" : "Details"}
                          </button>

                          <a
                            href="https://letmebowl-catering.de/pages/bestellen"
                            className="ordersButton ordersButtonPrimary"
                          >
                            Erneut
                          </a>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="detailsPanel">
                          <div className="detailsTop">
                            <div>
                              <div className="ordersKicker">Bestelldetails</div>
                              <h4 className="detailsTitle">{order.orderNumber || order.id}</h4>
                              <p className="ordersText">
                                {decodeText(order.billingCompanyName || order.companyName || "Firmenbestellung")}
                              </p>
                            </div>
                          </div>

                          <div className="detailsGrid">
                            <Mini label="Status" value={getStatusLabel(order.status)} />
                            <Mini label="Erstellt" value={formatDate(order.createdAt, locale)} />
                            <Mini label="Lieferdatum" value={formatDate(order.deliveryDate, locale)} />
                            <Mini
                              label="Gesamt"
                              value={formatMoney(order.totalAmount, order.currency, locale)}
                            />
                          </div>

                          {order.items.length === 0 ? (
                            <div className="ordersText">Keine Positionen gespeichert.</div>
                          ) : (
                            <div className="itemsList">
                              {order.items.map((item) => (
                                <div className="itemRow" key={item.id}>
                                  <div className="itemTitle">{decodeText(item.title)}</div>
                                  <div className="orderValue">x {item.quantity}</div>
                                  <div className="orderValue">
                                    {formatMoney(item.totalPrice, order.currency, locale)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  </Fragment>
                );
              })}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function Stat({ label, value, text }) {
  return (
    <div className="statCard">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
      <div className="statText">{text}</div>
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

function decodeText(value) {
  if (!value) return "";

  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function formatDate(value, locale = "de") {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatMoney(value, currency = "EUR", locale = "de") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "EUR"}`;
  }
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
