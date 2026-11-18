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
