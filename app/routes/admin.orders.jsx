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