import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

function euro(value) {
  const num = Number(value || 0);
  return num.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function orderStatusLabel(status) {
  if (status === "CONFIRMED") return "Bestätigt";
  if (status === "IN_PREPARATION") return "In Vorbereitung";
  if (status === "DELIVERED") return "Geliefert";
  if (status === "CANCELLED") return "Storniert";
  return "Offen";
}

function orderStatusClass(status) {
  if (status === "DELIVERED") return "paid";
  if (status === "CANCELLED") return "overdue";
  if (status === "CONFIRMED" || status === "IN_PREPARATION") return "open";
  return "open";
}

function invoiceLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

function invoiceStatusClass(status) {
  if (status === "BEZAHLT") return "paid";
  if (status === "UEBERFAELLIG") return "overdue";
  return "open";
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const customers = await prisma.portalUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  const invoices = await prisma.portalInvoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: {
        select: {
          companyName: true,
          email: true,
        },
      },
    },
  });

  const orders = await prisma.portalOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
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

  const customerCount = await prisma.portalUser.count();

  const activeCustomerCount = await prisma.portalUser.count({
    where: { isActive: true },
  });

  const invoiceCount = await prisma.portalInvoice.count();

  const orderCount = await prisma.portalOrder.count();

  const openOrderCount = await prisma.portalOrder.count({
    where: {
      status: {
        in: ["OPEN", "CONFIRMED", "IN_PREPARATION"],
      },
    },
  });

  const openInvoices = await prisma.portalInvoice.findMany({
    where: {
      status: {
        in: ["OFFEN", "UEBERFAELLIG"],
      },
    },
    select: {
      amountGross: true,
    },
  });

  const openAmount = openInvoices.reduce((sum, inv) => {
    return sum + Number(inv.amountGross || 0);
  }, 0);

  const orderAmountRaw = await prisma.portalOrder.findMany({
    select: {
      totalAmount: true,
    },
  });

  const orderAmount = orderAmountRaw.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  return {
    user,
    stats: {
      customerCount,
      activeCustomerCount,
      inactiveCustomerCount: customerCount - activeCustomerCount,
      invoiceCount,
      openAmount,
      orderCount,
      openOrderCount,
      orderAmount,
    },
    customers: customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    invoices: invoices.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      amountGross: i.amountGross ? i.amountGross.toString() : null,
    })),
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      orderedAt: o.orderedAt ? o.orderedAt.toISOString() : null,
      deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
      subtotalAmount: o.subtotalAmount ? o.subtotalAmount.toString() : null,
      taxAmount: o.taxAmount ? o.taxAmount.toString() : null,
      totalAmount: o.totalAmount ? o.totalAmount.toString() : "0",
      items: o.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice ? item.unitPrice.toString() : null,
        totalPrice: item.totalPrice ? item.totalPrice.toString() : null,
      })),
    })),
  };
}

export default function AdminDashboardPage() {
  const { user, stats, customers, invoices, orders } = useLoaderData();

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Überblick über Firmenkunden, Bestellungen, Rechnungen und offene Beträge."
      user={user}
    >


      <div className="lmbAdminDashboard">
        <section className="lmbStatsGrid">
          <div className="lmbStatBox">
            <div className="lmbStatLabel">Firmenkonten</div>
            <div className="lmbStatValue">{stats.customerCount}</div>
            <div className="lmbStatText">Gesamte Kundenkonten im Portal.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Aktiv</div>
            <div className="lmbStatValue">{stats.activeCustomerCount}</div>
            <div className="lmbStatText">Aktiv nutzbare Firmenkonten.</div>
          </div>

          <div className="lmbStatBox isImportant">
            <div className="lmbStatLabel">Offene Bestellungen</div>
            <div className="lmbStatValue">{stats.openOrderCount}</div>
            <div className="lmbStatText">Neue oder laufende Kundenbestellungen.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Bestellwert</div>
            <div className="lmbStatValue">{euro(stats.orderAmount)}</div>
            <div className="lmbStatText">Gesamtwert aller Portalbestellungen.</div>
          </div>
        </section>

        <section className="lmbStatsGrid">
          <div className="lmbStatBox">
            <div className="lmbStatLabel">Bestellungen</div>
            <div className="lmbStatValue">{stats.orderCount}</div>
            <div className="lmbStatText">Alle gespeicherten Portalbestellungen.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Rechnungen</div>
            <div className="lmbStatValue">{stats.invoiceCount}</div>
            <div className="lmbStatText">Bereits hochgeladene Rechnungen.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Offene Beträge</div>
            <div className="lmbStatValue">{euro(stats.openAmount)}</div>
            <div className="lmbStatText">Ausstehender Rechnungsbetrag.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Nicht aktiv</div>
            <div className="lmbStatValue">{stats.inactiveCustomerCount}</div>
            <div className="lmbStatText">Noch nicht freigegebene Firmenkonten.</div>
          </div>
        </section>

        <section className="lmbCard lmbCardWide">
          <div className="lmbEyebrow">Schnellzugriff</div>
          <h2 className="lmbH2">Admin-Aktionen</h2>
          <p className="lmbText">
            Von hier aus kannst du neue Bestellungen prüfen, Firmenkonten verwalten,
            Freigaben prüfen, Rechnungen hochladen und Zahlungsstatus kontrollieren.
          </p>

          <div className="lmbQuickLinks">
            <a href="/admin/orders" className="lmbQuickLink isGold">
              Bestellungen prüfen <span>→</span>
            </a>

            <a href="/admin/customers" className="lmbQuickLink">
              Firmenkunden verwalten <span>→</span>
            </a>

            <a href="/admin/invoices" className="lmbQuickLink">
              Rechnungen verwalten <span>→</span>
            </a>
          </div>
        </section>

        <section className="lmbCard lmbCardWide">
          <div className="lmbEyebrow">Neue Bestellungen</div>
          <h2 className="lmbH2">Letzte Portalbestellungen</h2>
          <p className="lmbText">
            Sobald eine Rechnungskauf- oder Portalbestellung eingeht, erscheint sie hier
            und du erhältst zusätzlich eine E-Mail-Benachrichtigung.
          </p>

          {orders.length === 0 ? (
            <p className="lmbEmptyText">Noch keine Bestellungen vorhanden.</p>
          ) : (
            <div className="lmbList">
              {orders.map((order) => (
                <article key={order.id} className="lmbItem isOrder">
                  <div className="lmbItemTop">
                    <div>
                      <div className="lmbItemTitle">{order.orderNumber}</div>
                      <div className="lmbItemMeta">
                        Firma: {order.user?.companyName || order.billingCompanyName || "-"}
                        <br />
                        E-Mail: {order.user?.email || order.billingEmail || "-"}
                        <br />
                        Eingegangen am {formatDate(order.createdAt)}
                      </div>
                    </div>

                    <span className={`lmbBadge ${orderStatusClass(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="lmbOrderGrid">
                    <div className="lmbOrderInfo">
                      <div className="lmbOrderInfoLabel">Betrag</div>
                      <div className="lmbOrderInfoValue">
                        {euro(order.totalAmount)}
                      </div>
                    </div>

                    <div className="lmbOrderInfo">
                      <div className="lmbOrderInfoLabel">Positionen</div>
                      <div className="lmbOrderInfoValue">
                        {order.items?.length || 0}
                      </div>
                    </div>

                    <div className="lmbOrderInfo">
                      <div className="lmbOrderInfoLabel">Kostenstelle</div>
                      <div className="lmbOrderInfoValue">
                        {order.costCenter?.name || "-"}
                      </div>
                    </div>

                    <div className="lmbOrderInfo">
                      <div className="lmbOrderInfoLabel">Lieferadresse</div>
                      <div className="lmbOrderInfoValue">
                        {order.deliveryAddress?.label || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="lmbItemFooter">
                    <div className="lmbItemMeta">
                      {order.items?.slice(0, 2).map((item) => item.title).join(" · ") ||
                        "Keine Positionen hinterlegt"}
                      {order.items?.length > 2 ? ` · +${order.items.length - 2} weitere` : ""}
                    </div>

                    <a href={`/admin/orders/${order.id}`} className="lmbSmallLink">
                      Bestellung öffnen
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="lmbContentGrid">
          <section className="lmbCard">
            <div className="lmbEyebrow">Letzte Firmenkonten</div>
            <h2 className="lmbH2">Neueste Kunden</h2>

            {customers.length === 0 ? (
              <p className="lmbEmptyText">Noch keine Firmenkunden vorhanden.</p>
            ) : (
              <div className="lmbList">
                {customers.map((customer) => (
                  <article key={customer.id} className="lmbItem">
                    <div className="lmbItemTop">
                      <div>
                        <div className="lmbItemTitle">{customer.companyName}</div>
                        <div className="lmbItemMeta">
                          {customer.firstName} {customer.lastName}
                          <br />
                          {customer.email}
                          <br />
                          Angelegt am {formatDate(customer.createdAt)}
                        </div>
                      </div>

                      <span className={`lmbBadge ${customer.isActive ? "active" : "inactive"}`}>
                        {customer.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="lmbCard">
            <div className="lmbEyebrow">Letzte Rechnungen</div>
            <h2 className="lmbH2">Neueste Uploads</h2>

            {invoices.length === 0 ? (
              <p className="lmbEmptyText">Noch keine Rechnungen vorhanden.</p>
            ) : (
              <div className="lmbList">
                {invoices.map((invoice) => (
                  <article key={invoice.id} className="lmbItem">
                    <div className="lmbItemTop">
                      <div>
                        <div className="lmbItemTitle">{invoice.invoiceNumber}</div>
                        <div className="lmbItemMeta">
                          Firma: {invoice.user?.companyName || "-"}
                          <br />
                          E-Mail: {invoice.user?.email || "-"}
                          <br />
                          Hochgeladen am {formatDate(invoice.createdAt)}
                          <br />
                          Betrag: {invoice.amountGross ? euro(invoice.amountGross) : "—"}
                        </div>
                      </div>

                      <span className={`lmbBadge ${invoiceStatusClass(invoice.status)}`}>
                        {invoiceLabel(invoice.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}