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

  const customerCount = await prisma.portalUser.count();
  const activeCustomerCount = await prisma.portalUser.count({
    where: { isActive: true },
  });

  const invoiceCount = await prisma.portalInvoice.count();

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

  return {
    user,
    stats: {
      customerCount,
      activeCustomerCount,
      inactiveCustomerCount: customerCount - activeCustomerCount,
      invoiceCount,
      openAmount,
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
  };
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

export default function AdminDashboardPage() {
  const { user, stats, customers, invoices } = useLoaderData();

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Überblick über Firmenkunden, Rechnungen und offene Beträge."
      user={user}
    >
      <style>{`
        .lmbAdminDashboard {
          display: grid;
          gap: 22px;
        }

        .lmbStatsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .lmbStatBox {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
          min-width: 0;
        }

        .lmbStatLabel {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #756b5f;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .lmbStatValue {
          font-size: 34px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.045em;
          color: #171717;
          overflow-wrap: anywhere;
        }

        .lmbStatText {
          margin-top: 8px;
          font-size: 14px;
          color: #756b5f;
          line-height: 1.5;
          font-weight: 600;
        }

        .lmbContentGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          align-items: start;
        }

        .lmbCard {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
          min-width: 0;
        }

        .lmbCardWide {
          grid-column: 1 / -1;
        }

        .lmbEyebrow {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #b08b4f;
          font-weight: 950;
          margin-bottom: 14px;
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

        .lmbQuickLinks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .lmbQuickLink {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 16px 18px;
          border-radius: 18px;
          font-weight: 950;
          min-height: 58px;
          box-shadow: 0 14px 30px rgba(17,17,17,0.08);
        }

        .lmbQuickLink span {
          opacity: 0.7;
          font-size: 18px;
        }

        .lmbList {
          display: grid;
          gap: 12px;
        }

        .lmbItem {
          border: 1px solid #ece5d8;
          border-radius: 20px;
          padding: 18px;
          background: #fbf8f2;
          min-width: 0;
        }

        .lmbItemTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .lmbItemTitle {
          font-size: 18px;
          line-height: 1.2;
          font-weight: 950;
          margin-bottom: 8px;
          color: #171717;
          overflow-wrap: anywhere;
        }

        .lmbItemMeta {
          font-size: 14px;
          color: #6b6258;
          line-height: 1.6;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .lmbBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lmbBadge.active {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.inactive {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbBadge.open {
          background: #fbf3e3;
          color: #7a5a18;
          border: 1px solid #efdcae;
        }

        .lmbBadge.paid {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.overdue {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbEmptyText {
          margin: 0;
          padding: 20px;
          border-radius: 18px;
          background: #fbf8f2;
          border: 1px dashed #dccfba;
          color: #756b5f;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .lmbStatsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lmbContentGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .lmbAdminDashboard {
            gap: 16px;
          }

          .lmbStatsGrid {
            gap: 10px;
          }

          .lmbStatBox {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbStatLabel {
            font-size: 10.5px;
            margin-bottom: 8px;
          }

          .lmbStatValue {
            font-size: 28px;
          }

          .lmbStatText {
            font-size: 13px;
          }

          .lmbCard {
            padding: 18px;
            border-radius: 22px;
          }

          .lmbH2 {
            font-size: 23px;
          }

          .lmbText {
            font-size: 14px;
          }

          .lmbQuickLinks {
            grid-template-columns: 1fr;
          }

          .lmbQuickLink {
            min-height: 54px;
          }

          .lmbItem {
            padding: 16px;
            border-radius: 18px;
          }

          .lmbItemTop {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .lmbBadge {
            justify-self: start;
          }
        }

        @media (max-width: 420px) {
          .lmbStatsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Rechnungen</div>
            <div className="lmbStatValue">{stats.invoiceCount}</div>
            <div className="lmbStatText">Bereits hochgeladene Rechnungen.</div>
          </div>

          <div className="lmbStatBox">
            <div className="lmbStatLabel">Offen</div>
            <div className="lmbStatValue">{euro(stats.openAmount)}</div>
            <div className="lmbStatText">Ausstehender Gesamtbetrag.</div>
          </div>
        </section>

        <section className="lmbCard lmbCardWide">
          <div className="lmbEyebrow">Schnellzugriff</div>
          <h2 className="lmbH2">Admin-Aktionen</h2>
          <p className="lmbText">
            Von hier aus kannst du Firmenkonten verwalten, Freigaben prüfen,
            Rechnungen hochladen und Zahlungsstatus kontrollieren.
          </p>

          <div className="lmbQuickLinks">
            <a href="/admin/customers" className="lmbQuickLink">
              Firmenkunden verwalten <span>→</span>
            </a>

            <a href="/admin/invoices" className="lmbQuickLink">
              Rechnungen verwalten <span>→</span>
            </a>
          </div>
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