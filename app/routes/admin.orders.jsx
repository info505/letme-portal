import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object") {
    if (typeof value.toNumber === "function") {
      const parsed = value.toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function euro(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(numberValue(value));
}

function statusLabel(status) {
  if (status === "CONFIRMED") return "Bestätigt";
  if (status === "IN_PREPARATION") return "In Vorbereitung";
  if (status === "DELIVERED") return "Geliefert";
  if (status === "CANCELLED") return "Storniert";
  return "Offen";
}

function statusClass(status) {
  if (status === "DELIVERED") return "delivered";
  if (status === "CANCELLED") return "cancelled";
  if (status === "CONFIRMED") return "confirmed";
  if (status === "IN_PREPARATION") return "preparation";
  return "open";
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const orders = await prisma.portalOrder.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          companyName: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      items: true,
      costCenter: true,
      deliveryAddress: true,
    },
  });

  const openCount = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.status === "DELIVERED"
  ).length;

  const cancelledCount = orders.filter(
    (order) => order.status === "CANCELLED"
  ).length;

  const totalAmount = orders.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  return {
    user,
    orders: orders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      orderedAt: order.orderedAt ? order.orderedAt.toISOString() : null,
      deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
      totalAmount: order.totalAmount ? order.totalAmount.toString() : "0",
      subtotalAmount: order.subtotalAmount
        ? order.subtotalAmount.toString()
        : null,
      taxAmount: order.taxAmount ? order.taxAmount.toString() : null,
    })),
    stats: {
      totalCount: orders.length,
      openCount,
      deliveredCount,
      cancelledCount,
      totalAmount,
    },
  };
}

export default function AdminOrdersPage() {
  const { user, orders, stats } = useLoaderData();

  return (
    <AdminLayout
      title="Bestellungen"
      subtitle="Alle eingegangenen Portal- und Firmenbestellungen im Überblick."
      user={user}
    >
      <style>{`
        .lmbOrdersPage {
          display: grid;
          gap: 22px;
        }

        .lmbStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .lmbStat {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 14px 35px rgba(30,20,10,0.04);
        }

        .lmbStatLabel {
          font-size: 11.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #756b5f;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .lmbStatValue {
          font-size: 30px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
          color: #171717;
          overflow-wrap: anywhere;
        }

        .lmbCard {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
        }

        .lmbEyebrow {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #b08b4f;
          font-weight: 950;
          margin-bottom: 12px;
        }

        .lmbH2 {
          margin: 0 0 12px;
          font-size: 28px;
          line-height: 1.08;
          letter-spacing: -0.035em;
          color: #171717;
        }

        .lmbText {
          margin: 0 0 22px;
          font-size: 15px;
          line-height: 1.7;
          color: #756b5f;
          font-weight: 600;
        }

        .lmbList {
          display: grid;
          gap: 14px;
        }

        .lmbOrderItem {
          border: 1px solid #ece5d8;
          border-radius: 22px;
          padding: 20px;
          background: #fbf8f2;
          display: grid;
          gap: 16px;
        }

        .lmbOrderTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 18px;
          align-items: start;
        }

        .lmbOrderNumber {
          font-size: 21px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.025em;
          color: #171717;
          margin-bottom: 12px;
          overflow-wrap: anywhere;
        }

        .lmbMetaGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px 18px;
        }

        .lmbMeta span {
          display: block;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 950;
          color: #9a8d7d;
          margin-bottom: 3px;
        }

        .lmbMeta strong {
          display: block;
          color: #332f2a;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .lmbSide {
          display: grid;
          justify-items: end;
          gap: 10px;
        }

        .lmbAmount {
          font-size: 24px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.035em;
          color: #171717;
          text-align: right;
        }

        .lmbBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          text-align: center;
          white-space: nowrap;
        }

        .lmbBadge.open {
          background: #fbf3e3;
          color: #7a5a18;
          border: 1px solid #efdcae;
        }

        .lmbBadge.confirmed {
          background: #eef4ff;
          color: #285ea8;
          border: 1px solid #cfddf6;
        }

        .lmbBadge.preparation {
          background: #fff6e9;
          color: #8a5a00;
          border: 1px solid #f0dfbf;
        }

        .lmbBadge.delivered {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.cancelled {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbNotes {
          white-space: pre-wrap;
          background: #fff;
          border: 1px solid #ece5d8;
          border-radius: 18px;
          padding: 16px;
          color: #6b6258;
          font-size: 13.5px;
          line-height: 1.55;
          max-height: 260px;
          overflow: auto;
        }

        .lmbItems {
          display: grid;
          gap: 8px;
        }

        .lmbItemLine {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #ece5d8;
          background: #fff;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          color: #171717;
        }

        .lmbEmpty {
          border: 1px dashed #dfd3bf;
          border-radius: 20px;
          padding: 24px;
          color: #756b5f;
          background: #fffdfa;
          font-weight: 800;
          text-align: center;
        }

        
          .lmbItems {
            margin-top: 18px;
            overflow: hidden;
            border: 1px solid rgba(18, 24, 38, 0.09);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.78);
          }

          .lmbItemsHeader {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(18, 24, 38, 0.08);
            background: rgba(198, 157, 83, 0.09);
            font-size: 13px;
            font-weight: 800;
          }

          .lmbItemsHeader span:last-child {
            color: rgba(18, 24, 38, 0.58);
            font-size: 12px;
          }

          .lmbItemsTable {
            display: grid;
          }

          .lmbProductRow {
            display: grid;
            grid-template-columns:
              minmax(220px, 1fr)
              minmax(80px, 0.32fr)
              minmax(105px, 0.42fr)
              minmax(105px, 0.42fr);
            gap: 16px;
            align-items: center;
            padding: 15px 16px;
            border-bottom: 1px solid rgba(18, 24, 38, 0.07);
          }

          .lmbProductRow:last-child {
            border-bottom: 0;
          }

          .lmbProductRow.isDeliveryFee {
            background: rgba(198, 157, 83, 0.08);
          }

          .lmbProductMain {
            min-width: 0;
          }

          .lmbProductTitleRow {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .lmbProductTitle {
            color: #121826;
            font-size: 14px;
            line-height: 1.35;
          }

          .lmbProductBadge {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 3px 9px;
            border: 1px solid rgba(170, 124, 42, 0.22);
            border-radius: 999px;
            background: rgba(198, 157, 83, 0.14);
            color: #755118;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .lmbProductDetails {
            display: flex;
            flex-wrap: wrap;
            gap: 5px 12px;
            margin-top: 5px;
            color: rgba(18, 24, 38, 0.58);
            font-size: 11px;
          }

          .lmbProductQuantity,
          .lmbProductPrice,
          .lmbProductTotal {
            display: grid;
            gap: 4px;
          }

          .lmbProductPrice,
          .lmbProductTotal {
            text-align: right;
          }

          .lmbProductLabel {
            color: rgba(18, 24, 38, 0.5);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .lmbProductQuantity strong,
          .lmbProductPrice strong,
          .lmbProductTotal strong {
            color: #121826;
            font-size: 13px;
          }

          .lmbOrderTotals {
            display: grid;
            gap: 8px;
            padding: 14px 16px;
            border-top: 1px solid rgba(18, 24, 38, 0.08);
            background: rgba(247, 243, 235, 0.72);
          }

          .lmbOrderTotals > div {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            color: rgba(18, 24, 38, 0.66);
            font-size: 12px;
          }

          .lmbOrderTotals strong {
            color: #121826;
          }

          .lmbOrderTotalFinal {
            margin-top: 3px;
            padding-top: 10px;
            border-top: 1px solid rgba(18, 24, 38, 0.1);
            font-size: 14px !important;
            font-weight: 900;
          }

          .lmbOrderTotalFinal strong {
            font-size: 17px;
          }

          .lmbItemsEmpty {
            margin-top: 16px;
            padding: 14px 16px;
            border: 1px dashed rgba(18, 24, 38, 0.16);
            border-radius: 16px;
            color: rgba(18, 24, 38, 0.56);
            font-size: 13px;
          }

          .lmbItems {
            margin-top: 18px;
            overflow: hidden;
            border: 1px solid rgba(18, 24, 38, 0.09);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.78);
          }

          .lmbItemsHeader {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 14px 16px;
            border-bottom: 1px solid rgba(18, 24, 38, 0.08);
            background: rgba(198, 157, 83, 0.09);
            font-size: 13px;
            font-weight: 800;
          }

          .lmbItemsHeader span:last-child {
            color: rgba(18, 24, 38, 0.58);
            font-size: 12px;
          }

          .lmbItemsTable {
            display: grid;
          }

          .lmbProductRow {
            display: grid;
            grid-template-columns:
              minmax(220px, 1fr)
              minmax(80px, 0.3fr)
              minmax(105px, 0.4fr)
              minmax(105px, 0.4fr);
            gap: 16px;
            align-items: center;
            padding: 15px 16px;
            border-bottom: 1px solid rgba(18, 24, 38, 0.07);
          }

          .lmbProductRow:last-child {
            border-bottom: 0;
          }

          .lmbProductRow.isDeliveryFee {
            background: rgba(198, 157, 83, 0.08);
          }

          .lmbProductMain {
            min-width: 0;
          }

          .lmbProductTitleRow {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .lmbProductTitle {
            color: #121826;
            font-size: 14px;
          }

          .lmbProductBadge {
            display: inline-flex;
            padding: 3px 9px;
            border: 1px solid rgba(170, 124, 42, 0.22);
            border-radius: 999px;
            background: rgba(198, 157, 83, 0.14);
            color: #755118;
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .lmbProductDetails {
            display: flex;
            flex-wrap: wrap;
            gap: 5px 12px;
            margin-top: 5px;
            color: rgba(18, 24, 38, 0.58);
            font-size: 11px;
          }

          .lmbProductQuantity,
          .lmbProductPrice,
          .lmbProductTotal {
            display: grid;
            gap: 4px;
          }

          .lmbProductPrice,
          .lmbProductTotal {
            text-align: right;
          }

          .lmbProductLabel {
            color: rgba(18, 24, 38, 0.5);
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .lmbOrderTotals {
            display: grid;
            gap: 8px;
            padding: 14px 16px;
            border-top: 1px solid rgba(18, 24, 38, 0.08);
            background: rgba(247, 243, 235, 0.72);
          }

          .lmbOrderTotals > div {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            font-size: 12px;
          }

          .lmbOrderTotalFinal {
            margin-top: 3px;
            padding-top: 10px;
            border-top: 1px solid rgba(18, 24, 38, 0.1);
            font-size: 14px !important;
            font-weight: 900;
          }

          .lmbOrderTotalFinal strong {
            font-size: 17px;
          }

          .lmbItemsEmpty {
            margin-top: 16px;
            padding: 14px 16px;
            border: 1px dashed rgba(18, 24, 38, 0.16);
            border-radius: 16px;
            font-size: 13px;
          }
@media (max-width: 1050px) {
          .lmbStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lmbOrderTop {
            grid-template-columns: 1fr;
          }

          .lmbSide {
            justify-items: start;
          }

          .lmbAmount {
            text-align: left;
          }

          .lmbMetaGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .lmbOrdersPage {
            gap: 16px;
          }

          .lmbStats {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .lmbStat {
            padding: 16px;
            border-radius: 18px;
          }

          .lmbCard {
            padding: 18px;
            border-radius: 22px;
          }

          .lmbH2 {
            font-size: 23px;
          }

          .lmbOrderItem {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbMetaGrid {
            grid-template-columns: 1fr;
          }

          .lmbItemLine {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="lmbOrdersPage">
        <section className="lmbStats">
          <Stat label="Bestellungen" value={stats.totalCount} />
          <Stat label="Offen" value={stats.openCount} />
          <Stat label="Geliefert" value={stats.deliveredCount} />
          <Stat label="Umsatz" value={euro(stats.totalAmount)} />
        </section>

        <section className="lmbCard">
          <div className="lmbEyebrow">Bestelleingang</div>
          <h2 className="lmbH2">Alle Bestellungen</h2>
          <p className="lmbText">
            Hier erscheinen alle Bestellungen, die über das Firmenkonto oder die Website an das Portal übergeben wurden.
          </p>

          {orders.length === 0 ? (
            <div className="lmbEmpty">Noch keine Bestellungen vorhanden.</div>
          ) : (
            <div className="lmbList">
              {orders.map((order) => (
                <article key={order.id} className="lmbOrderItem">
                  <div className="lmbOrderTop">
                    <div>
                      <div className="lmbOrderNumber">{order.orderNumber}</div>

                      <div className="lmbMetaGrid">
                        <Meta label="Firma" value={order.user?.companyName || "-"} />
                        <Meta label="Kontakt" value={order.billingContactName || "-"} />
                        <Meta label="E-Mail" value={order.billingEmail || order.user?.email || "-"} />
                        <Meta label="Telefon" value={order.billingPhone || "-"} />
                        <Meta label="Bestellt am" value={formatDate(order.orderedAt || order.createdAt)} />
                        <Meta label="Lieferdatum" value={formatDate(order.deliveryDate)} />
                        <Meta label="Typ" value={order.orderType || "-"} />
                        <Meta label="Kostenstelle" value={order.costCenter?.name || order.referenceNumber || "-"} />
                        <Meta label="Positionen" value={String(order.items?.length || 0)} />
                      </div>
                    </div>

                    <div className="lmbSide">
                      <div className="lmbAmount">
                        {euro(order.totalAmount)}
                      </div>

                      <span className={`lmbBadge ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  {order.items?.length ? (
                    <div className="lmbItems">
                      <div className="lmbItemsHeader">
                        <span>Bestellte Positionen</span>
                        <span>{order.items.length} Positionen</span>
                      </div>

                      <div className="lmbItemsTable">
                        {order.items.map((item) => {
                          const itemTitle = String(item.title || "Artikel");

                          const isDeliveryFee =
                            itemTitle.toLowerCase().includes("liefer") ||
                            String(item.notes || "")
                              .toLowerCase()
                              .includes("lieferkosten");

                          return (
                            <div
                              key={item.id}
                              className={`lmbProductRow ${
                                isDeliveryFee ? "isDeliveryFee" : ""
                              }`}
                            >
                              <div className="lmbProductMain">
                                <div className="lmbProductTitleRow">
                                  <strong className="lmbProductTitle">
                                    {itemTitle}
                                  </strong>

                                  {isDeliveryFee ? (
                                    <span className="lmbProductBadge">
                                      Lieferkosten
                                    </span>
                                  ) : null}
                                </div>

                                <div className="lmbProductDetails">
                                  {item.variantTitle ? (
                                    <span>Variante: {item.variantTitle}</span>
                                  ) : null}

                                  {item.sku ? (
                                    <span>SKU: {item.sku}</span>
                                  ) : null}

                                  {item.notes && !isDeliveryFee ? (
                                    <span>Hinweis: {item.notes}</span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="lmbProductQuantity">
                                <span className="lmbProductLabel">Menge</span>
                                <strong>
                                  {item.quantity || 1}
                                  {item.unit ? ` ${item.unit}` : ""}
                                </strong>
                              </div>

                              <div className="lmbProductPrice">
                                <span className="lmbProductLabel">
                                  Einzelpreis
                                </span>
                                <strong>
                                  {euro(item.unitPrice)}
                                </strong>
                              </div>

                              <div className="lmbProductTotal">
                                <span className="lmbProductLabel">Gesamt</span>
                                <strong>
                                  {euro(item.totalPrice)}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="lmbOrderTotals">
                        <div>
                          <span>Zwischensumme</span>
                          <strong>{euro(order.subtotalAmount)}</strong>
                        </div>

                        <div>
                          <span>Enthaltene Steuer</span>
                          <strong>{euro(order.taxAmount)}</strong>
                        </div>

                        <div className="lmbOrderTotalFinal">
                          <span>Gesamtbetrag</span>
                          <strong>{euro(order.totalAmount)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="lmbItemsEmpty">
                      Für diese Bestellung wurden keine Positionen gespeichert.
                    </div>
                  )}
{order.notes ? (
                    <div className="lmbNotes">{order.notes}</div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div className="lmbStat">
      <div className="lmbStatLabel">{label}</div>
      <div className="lmbStatValue">{value}</div>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="lmbMeta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}