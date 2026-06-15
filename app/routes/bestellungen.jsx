import { Fragment } from "react";
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
          display: grid;
          gap: 14px;
          width: 100%;
        }

        .ordersHero {
          background: #ffffff;
          border: 1px solid #e4e8ee;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.035);
        }

        .ordersKicker {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #b0802c;
          margin-bottom: 4px;
        }

        .ordersTitle {
          margin: 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.12;
          letter-spacing: -0.03em;
          font-weight: 900;
        }

        .ordersText {
          margin: 4px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 600;
        }

        .ordersButton {
          min-height: 34px;
          padding: 0 13px;
          border-radius: 9px;
          border: 1px solid #d7dde6;
          background: #ffffff;
          color: #111827;
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
          border: 1px solid #e4e8ee;
          border-radius: 14px;
          padding: 13px 14px;
        }

        .statLabel {
          color: #697586;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .statValue {
          color: #111827;
          font-size: 23px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .statText {
          margin-top: 5px;
          color: #667085;
          font-size: 11px;
          font-weight: 650;
        }

        .ordersPanel {
          background: #ffffff;
          border: 1px solid #e4e8ee;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.035);
        }

        .ordersPanelHead {
          padding: 14px 16px;
          border-bottom: 1px solid #edf0f3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ordersPanelTitle {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .ordersPanelSub {
          margin: 2px 0 0;
          color: #667085;
          font-size: 11px;
          font-weight: 650;
        }

        .ordersTable {
          width: 100%;
        }

        .ordersTableHead,
        .ordersRow {
          display: grid;
          grid-template-columns: minmax(230px, 1.6fr) minmax(160px, 1fr) 90px 105px 88px 48px 72px 120px;
          gap: 10px;
          align-items: center;
        }

        .ordersTableHead {
          min-height: 34px;
          padding: 0 14px;
          background: #f8fafc;
          border-bottom: 1px solid #edf0f3;
          color: #697586;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ordersRow {
          min-height: 58px;
          padding: 8px 14px;
          border-bottom: 1px solid #edf0f3;
          background: #ffffff;
        }

        .ordersRow:hover {
          background: #fffaf1;
        }

        .ordersCell {
          min-width: 0;
        }

        .orderNumber {
          color: #111827;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }

        .orderCompany {
          color: #667085;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orderValue {
          color: #111827;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.15;
          white-space: nowrap;
        }

        .orderMuted {
          color: #667085;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .statusBadge {
          min-height: 22px;
          width: fit-content;
          padding: 0 8px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          border: 1px solid #e4e8ee;
          color: #111827;
          font-size: 9.5px;
          font-weight: 900;
          white-space: nowrap;
        }

        .actions {
          display: grid;
          gap: 5px;
        }

        .actions .ordersButton {
          min-height: 28px;
          width: 100%;
          font-size: 10px;
          padding: 0 8px;
        }

        .detailsRow {
          border-bottom: 1px solid #edf0f3;
          background: #fffdf8;
          padding: 12px 14px 14px;
        }

        .detailsBox {
          border: 1px solid #eadfcf;
          border-radius: 13px;
          background: #ffffff;
          padding: 12px;
          display: grid;
          gap: 10px;
        }

        .detailsTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .detailsTitle {
          margin: 0;
          font-size: 16px;
          font-weight: 950;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .detailMini {
          border: 1px solid #edf0f3;
          background: #f8fafc;
          border-radius: 10px;
          padding: 8px 9px;
        }

        .detailLabel {
          color: #697586;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .detailValue {
          color: #111827;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.15;
        }

        .itemsList {
          display: grid;
          gap: 0;
          border-top: 1px solid #edf0f3;
        }

        .itemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 54px 90px;
          gap: 8px;
          padding: 7px 0;
          border-bottom: 1px solid #edf0f3;
          align-items: center;
        }

        .itemRow:last-child {
          border-bottom: 0;
        }

        .emptyState {
          padding: 26px 16px;
          text-align: center;
          color: #667085;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 1250px) {
          .ordersTableHead {
            display: none;
          }

          .ordersRow {
            grid-template-columns: 1fr;
            gap: 7px;
            align-items: start;
          }

          .ordersCell::before {
            content: attr(data-label);
            display: block;
            color: #697586;
            font-size: 8px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .actions {
            grid-template-columns: 1fr 1fr;
          }

          .detailsGrid,
          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .ordersHero,
          .ordersPanelHead,
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
        <section className="ordersHero">
          <div>
            <div className="ordersKicker">Bestellübersicht</div>
            <h2 className="ordersTitle">Firmenbestellungen</h2>
            <p className="ordersText">
              Kompakte Übersicht deiner Bestellungen, Lieferdaten und Beträge.
            </p>
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
            <div>
              <h3 className="ordersPanelTitle">Deine Bestellungen</h3>
              <p className="ordersPanelSub">Neueste Bestellung zuerst.</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="emptyState">Noch keine Bestellungen vorhanden.</div>
          ) : (
            <div className="ordersTable">
              <div className="ordersTableHead">
                <div>Bestellung</div>
                <div>Firma</div>
                <div>Erstellt</div>
                <div>Lieferdatum</div>
                <div>Betrag</div>
                <div>Pos.</div>
                <div>Status</div>
                <div>Aktionen</div>
              </div>

              {orders.map((order) => (
                <Fragment key={order.id}>
                  <article className="ordersRow">
                    <div className="ordersCell" data-label="Bestellung">
                      <div className="orderNumber">{order.orderNumber || "—"}</div>
                    </div>

                    <div className="ordersCell" data-label="Firma">
                      <div className="orderCompany">
                        {order.billingCompanyName || order.companyName || "Firmenbestellung"}
                      </div>
                    </div>

                    <div className="ordersCell" data-label="Erstellt">
                      <div className="orderValue">{formatDate(order.createdAt, locale)}</div>
                    </div>

                    <div className="ordersCell" data-label="Lieferdatum">
                      <div className="orderValue">{formatDate(order.deliveryDate, locale)}</div>
                    </div>

                    <div className="ordersCell" data-label="Betrag">
                      <div className="orderValue">
                        {formatMoney(order.totalAmount, order.currency, locale)}
                      </div>
                    </div>

                    <div className="ordersCell" data-label="Positionen">
                      <div className="orderValue">{order.items.length}</div>
                    </div>

                    <div className="ordersCell" data-label="Status">
                      <span className="statusBadge">{getStatusLabel(order.status)}</span>
                    </div>

                    <div className="actions">
                      <a
                        href={`/bestellungen?detail=${encodeURIComponent(order.id)}&lang=${locale}`}
                        className="ordersButton"
                      >
                        Details
                      </a>
                      <a
                        href="https://letmebowl-catering.de/pages/bestellen"
                        className="ordersButton ordersButtonPrimary"
                      >
                        Erneut
                      </a>
                    </div>
                  </article>

                  {selectedOrder && selectedOrder.id === order.id ? (
                    <div className="detailsRow">
                      <div className="detailsBox">
                        <div className="detailsTop">
                          <div>
                            <div className="ordersKicker">Bestelldetails</div>
                            <h4 className="detailsTitle">
                              {selectedOrder.orderNumber || selectedOrder.id}
                            </h4>
                            <p className="ordersText">
                              {selectedOrder.billingCompanyName ||
                                selectedOrder.companyName ||
                                "Firmenbestellung"}
                            </p>
                          </div>

                          <a href={`/bestellungen?lang=${locale}`} className="ordersButton">
                            Schließen
                          </a>
                        </div>

                        <div className="detailsGrid">
                          <Mini label="Status" value={getStatusLabel(selectedOrder.status)} />
                          <Mini label="Erstellt" value={formatDate(selectedOrder.createdAt, locale)} />
                          <Mini
                            label="Lieferdatum"
                            value={formatDate(selectedOrder.deliveryDate, locale)}
                          />
                          <Mini
                            label="Gesamt"
                            value={formatMoney(
                              selectedOrder.totalAmount,
                              selectedOrder.currency,
                              locale
                            )}
                          />
                        </div>

                        {selectedOrder.items.length === 0 ? (
                          <div className="ordersText">Keine Positionen gespeichert.</div>
                        ) : (
                          <div className="itemsList">
                            {selectedOrder.items.map((item) => (
                              <div className="itemRow" key={item.id}>
                                <div className="orderMuted">{item.title}</div>
                                <div className="orderValue">x {item.quantity}</div>
                                <div className="orderValue">
                                  {formatMoney(item.totalPrice, selectedOrder.currency, locale)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
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
