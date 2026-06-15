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
          display: grid;
          gap: 14px;
        }

        .ordersIntro {
          background: #ffffff;
          border: 1px solid #e5e9ef;
          border-radius: 14px;
          padding: 15px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .ordersKicker {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #b5822d;
          margin-bottom: 4px;
        }

        .ordersTitle {
          margin: 0;
          color: #101828;
          font-size: 21px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .ordersText {
          margin: 4px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 600;
        }

        .ordersButton {
          min-height: 31px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #d6dce5;
          background: #ffffff;
          color: #101828;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 10.5px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .ordersButtonPrimary {
          border-color: #b5822d;
          background: #b5822d;
          color: #ffffff;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e5e9ef;
          border-radius: 13px;
          padding: 11px 13px;
        }

        .statLabel {
          color: #667085;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .statValue {
          color: #101828;
          font-size: 22px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .statText {
          margin-top: 5px;
          color: #667085;
          font-size: 11px;
          font-weight: 600;
        }

        .ordersPanel {
          background: #ffffff;
          border: 1px solid #e5e9ef;
          border-radius: 14px;
          overflow: hidden;
        }

        .ordersPanelHead {
          padding: 13px 15px;
          border-bottom: 1px solid #edf0f3;
        }

        .ordersPanelTitle {
          margin: 0;
          color: #101828;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .ordersPanelSub {
          margin: 3px 0 0;
          color: #667085;
          font-size: 11px;
          font-weight: 600;
        }

        .ordersHeader,
        .orderMain {
          display: grid;
          grid-template-columns: minmax(180px, 1.4fr) minmax(180px, 1.3fr) 92px 104px 88px 48px 72px 116px;
          gap: 10px;
          align-items: center;
        }

        .ordersHeader {
          min-height: 34px;
          padding: 0 13px;
          background: #f8fafc;
          border-bottom: 1px solid #edf0f3;
          color: #667085;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .orderBlock {
          border-bottom: 1px solid #edf0f3;
          background: #ffffff;
        }

        .orderBlock:last-child {
          border-bottom: 0;
        }

        .orderMain {
          min-height: 56px;
          padding: 8px 13px;
        }

        .orderBlock:hover .orderMain {
          background: #fffaf1;
        }

        .orderCell {
          min-width: 0;
        }

        .orderNumber {
          color: #101828;
          font-size: 12.5px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .orderCompany {
          color: #667085;
          font-size: 10.5px;
          line-height: 1.2;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orderValue {
          color: #101828;
          font-size: 10.5px;
          line-height: 1.1;
          font-weight: 850;
          white-space: nowrap;
        }

        .statusBadge {
          min-height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e1e6ee;
          color: #101828;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 5px;
        }

        .actions .ordersButton {
          width: 100%;
          min-height: 27px;
          font-size: 10px;
          padding: 0 8px;
        }

        .detailsPanel {
          margin: 0 13px 11px;
          padding: 12px;
          border: 1px solid #eadfcf;
          border-radius: 12px;
          background: #fffdf8;
        }

        .detailsTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .detailsTitle {
          margin: 0;
          color: #101828;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .detailMini {
          border: 1px solid #edf0f3;
          background: #ffffff;
          border-radius: 9px;
          padding: 8px 9px;
        }

        .detailLabel {
          color: #667085;
          font-size: 7.5px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .detailValue {
          color: #101828;
          font-size: 10.5px;
          font-weight: 850;
          line-height: 1.15;
        }

        .itemsList {
          border-top: 1px solid #edf0f3;
        }

        .itemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 52px 86px;
          gap: 8px;
          align-items: center;
          padding: 7px 0;
          border-bottom: 1px solid #edf0f3;
        }

        .itemRow:last-child {
          border-bottom: 0;
        }

        .itemTitle {
          color: #475467;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.2;
        }

        .emptyState {
          padding: 26px 16px;
          text-align: center;
          color: #667085;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 1250px) {
          .ordersHeader {
            display: none;
          }

          .orderMain {
            grid-template-columns: 1fr;
            gap: 7px;
            align-items: start;
            padding: 10px 13px;
          }

          .orderCell::before {
            content: attr(data-label);
            display: block;
            color: #667085;
            font-size: 8px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 2px;
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
