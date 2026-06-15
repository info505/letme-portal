import { useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getLocaleFromRequest, withLang } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const orderId = String(params.id || "").trim();

  let order = null;

  if (orderId) {
    order = await prisma.portalOrder.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId },
        ],
      },
      include: {
        items: true,
      },
    });
  }

  return {
    locale,
    orderId,
    found: Boolean(order),
    order: order
      ? {
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
          })),
        }
      : null,
  };
}

export default function BestellungDetailPage() {
  const { locale, orderId, found, order } = useLoaderData();

  return (
    <PortalLayout
      title={found ? (locale === "en" ? "Order details" : "Bestelldetails") : "DETAIL ROUTE GELADEN"}
      subtitle={found ? (order.orderNumber || orderId) : `Route funktioniert, aber Bestellung wurde nicht gefunden: ${orderId}`}
    >
      <style>{`
        .detailPage {
          display: grid;
          gap: 14px;
          width: 100%;
        }

        .detailCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(16,24,40,0.04);
          overflow: hidden;
        }

        .detailHero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border-bottom: 1px solid #eaecf0;
        }

        .detailKicker {
          margin-bottom: 6px;
          color: #a97d2f;
          font-size: 9.5px;
          font-weight: 850;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .detailTitle {
          margin: 0;
          color: #17191c;
          font-size: clamp(24px, 2.6vw, 34px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .detailText {
          margin-top: 7px;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 500;
        }

        .detailButton {
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
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .detailButtonPrimary {
          border-color: #a97d2f;
          background: #a97d2f;
          color: #ffffff;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 20px;
        }

        .detailBox {
          padding: 13px;
          border-radius: 10px;
          border: 1px solid #eaecf0;
          background: #f8fafc;
        }

        .detailLabel {
          margin-bottom: 5px;
          color: #667085;
          font-size: 8.5px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .detailValue {
          color: #17191c;
          font-size: 13px;
          font-weight: 850;
        }

        .itemsTitle {
          padding: 17px 20px;
          border-top: 1px solid #eaecf0;
          border-bottom: 1px solid #eaecf0;
          color: #17191c;
          font-size: 18px;
          font-weight: 900;
        }

        .itemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 100px 120px;
          gap: 12px;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid #f0f2f4;
        }

        .itemRow:last-child {
          border-bottom: 0;
        }

        .itemTitle {
          color: #17191c;
          font-size: 13px;
          font-weight: 850;
        }

        .itemMuted {
          color: #667085;
          font-size: 12px;
          font-weight: 650;
        }

        @media (max-width: 900px) {
          .detailHero,
          .itemRow {
            display: grid;
          }

          .detailGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .detailGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="detailPage">
        {!found ? (
          <section className="detailCard">
            <div className="detailHero">
              <div>
                <div className="detailKicker">Debug</div>
                <h2 className="detailTitle">DETAIL ROUTE GELADEN</h2>
                <div className="detailText">
                  Die Detailseite wird jetzt geladen, aber diese Bestellung wurde in der Datenbank nicht gefunden.
                  <br />
                  Gesuchte ID: <strong>{orderId}</strong>
                </div>
              </div>

              <a href={withLang("/bestellungen", locale)} className="detailButton">
                Zurück zu Bestellungen
              </a>
            </div>
          </section>
        ) : (
          <section className="detailCard">
            <div className="detailHero">
              <div>
                <div className="detailKicker">{locale === "en" ? "Order" : "Bestellung"}</div>
                <h2 className="detailTitle">{order.orderNumber || order.id}</h2>
                <div className="detailText">
                  {order.billingCompanyName || order.companyName || "Let Me Bowl Firmenkonto"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <a href={withLang("/bestellungen", locale)} className="detailButton">
                  Zurück
                </a>
                <a href="https://letmebowl-catering.de/pages/bestellen" className="detailButton detailButtonPrimary">
                  Erneut bestellen
                </a>
              </div>
            </div>

            <div className="detailGrid">
              <Box label="Status" value={order.status} />
              <Box label="Erstellt" value={formatDate(order.createdAt, locale)} />
              <Box label="Lieferdatum" value={formatDate(order.deliveryDate, locale)} />
              <Box label="Gesamt" value={formatMoney(order.totalAmount, order.currency, locale)} />
            </div>

            <div className="itemsTitle">Positionen</div>

            {order.items.length === 0 ? (
              <div className="itemRow">
                <div className="itemMuted">Keine Positionen gespeichert.</div>
              </div>
            ) : (
              order.items.map((item) => (
                <div className="itemRow" key={item.id}>
                  <div>
                    <div className="itemTitle">{item.title}</div>
                    <div className="itemMuted">Menge: {item.quantity}</div>
                  </div>
                  <div className="itemMuted">{formatMoney(item.unitPrice, order.currency, locale)}</div>
                  <div className="itemTitle">{formatMoney(item.totalPrice, order.currency, locale)}</div>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </PortalLayout>
  );
}

function Box({ label, value }) {
  return (
    <div className="detailBox">
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