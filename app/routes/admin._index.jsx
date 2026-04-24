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

const styles = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
  },
  statBox: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 18px 45px rgba(30,20,10,0.05)",
  },
  statLabel: {
    fontSize: "12px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#756b5f",
    fontWeight: 900,
    marginBottom: "10px",
  },
  statValue: {
    fontSize: "34px",
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  statText: {
    marginTop: "8px",
    fontSize: "14px",
    color: "#756b5f",
    lineHeight: 1.5,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 18px 45px rgba(30,20,10,0.05)",
  },
  eyebrow: {
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#b08b4f",
    fontWeight: 900,
    marginBottom: "14px",
  },
  h2: {
    margin: "0 0 12px",
    fontSize: "28px",
    letterSpacing: "-0.03em",
  },
  text: {
    margin: "0 0 22px",
    fontSize: "15px",
    lineHeight: 1.7,
    color: "#756b5f",
  },
  quickLinks: {
    display: "grid",
    gap: "12px",
  },
  quickLink: {
    display: "block",
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "15px 18px",
    borderRadius: "16px",
    fontWeight: 900,
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  item: {
    border: "1px solid #ece5d8",
    borderRadius: "18px",
    padding: "18px",
    background: "#fbf8f2",
  },
  itemTitle: {
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "8px",
  },
  itemMeta: {
    fontSize: "14px",
    color: "#6b6258",
    lineHeight: 1.6,
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
    marginTop: "10px",
  },
  active: {
    background: "#edf6ed",
    color: "#2f6b35",
    border: "1px solid #cfe7cf",
  },
  inactive: {
    background: "#fbeaea",
    color: "#8a2d2d",
    border: "1px solid #efc9c9",
  },
  open: {
    background: "#fbf3e3",
    color: "#7a5a18",
    border: "1px solid #efdcae",
  },
  paid: {
    background: "#edf6ed",
    color: "#2f6b35",
    border: "1px solid #cfe7cf",
  },
  overdue: {
    background: "#fbeaea",
    color: "#8a2d2d",
    border: "1px solid #efc9c9",
  },
};

function invoiceLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

function invoiceBadgeStyle(status) {
  if (status === "BEZAHLT") return { ...styles.badge, ...styles.paid };
  if (status === "UEBERFAELLIG") return { ...styles.badge, ...styles.overdue };
  return { ...styles.badge, ...styles.open };
}

export default function AdminDashboardPage() {
  const { user, stats, customers, invoices } = useLoaderData();

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Überblick über Firmenkunden, Rechnungen und offene Beträge."
      user={user}
    >
      <div style={styles.statsGrid}>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Firmenkonten</div>
          <div style={styles.statValue}>{stats.customerCount}</div>
          <div style={styles.statText}>Gesamte Kundenkonten im Portal.</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Aktiv</div>
          <div style={styles.statValue}>{stats.activeCustomerCount}</div>
          <div style={styles.statText}>Aktiv nutzbare Firmenkonten.</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Rechnungen</div>
          <div style={styles.statValue}>{stats.invoiceCount}</div>
          <div style={styles.statText}>Bereits hochgeladene Rechnungen.</div>
        </div>

        <div style={styles.statBox}>
          <div style={styles.statLabel}>Offen</div>
          <div style={styles.statValue}>{euro(stats.openAmount)}</div>
          <div style={styles.statText}>Ausstehender Gesamtbetrag.</div>
        </div>
      </div>

      <div style={styles.contentGrid}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>Schnellzugriff</div>
          <h2 style={styles.h2}>Admin-Aktionen</h2>
          <p style={styles.text}>
            Von hier aus kannst du Firmenkonten verwalten oder Rechnungen
            hochladen und Zahlungsstatus prüfen.
          </p>

          <div style={styles.quickLinks}>
            <a href="/admin/customers" style={styles.quickLink}>
              Firmenkunden verwalten
            </a>
            <a href="/admin/invoices" style={styles.quickLink}>
              Rechnungen verwalten
            </a>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Letzte Firmenkonten</div>
          <h2 style={styles.h2}>Neueste Kunden</h2>

          {customers.length === 0 ? (
            <p style={styles.text}>Noch keine Firmenkunden vorhanden.</p>
          ) : (
            <div style={styles.list}>
              {customers.map((customer) => (
                <div key={customer.id} style={styles.item}>
                  <div style={styles.itemTitle}>{customer.companyName}</div>
                  <div style={styles.itemMeta}>
                    {customer.firstName} {customer.lastName}
                    <br />
                    {customer.email}
                    <br />
                    Angelegt am {formatDate(customer.createdAt)}
                  </div>
                  <span
                    style={{
                      ...styles.badge,
                      ...(customer.isActive ? styles.active : styles.inactive),
                    }}
                  >
                    {customer.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Letzte Rechnungen</div>
          <h2 style={styles.h2}>Neueste Uploads</h2>

          {invoices.length === 0 ? (
            <p style={styles.text}>Noch keine Rechnungen vorhanden.</p>
          ) : (
            <div style={styles.list}>
              {invoices.map((invoice) => (
                <div key={invoice.id} style={styles.item}>
                  <div style={styles.itemTitle}>{invoice.invoiceNumber}</div>
                  <div style={styles.itemMeta}>
                    Firma: {invoice.user?.companyName || "-"}
                    <br />
                    E-Mail: {invoice.user?.email || "-"}
                    <br />
                    Hochgeladen am {formatDate(invoice.createdAt)}
                    <br />
                    Betrag: {invoice.amountGross ? euro(invoice.amountGross) : "—"}
                  </div>
                  <span style={invoiceBadgeStyle(invoice.status)}>
                    {invoiceLabel(invoice.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Nächste Ausbaustufe</div>
          <h2 style={styles.h2}>Was als Nächstes sinnvoll ist</h2>

          <div style={styles.list}>
            <div style={styles.item}>
              <div style={styles.itemTitle}>Rechnungen bearbeiten</div>
              <div style={styles.itemMeta}>
                Status, Betrag, Fälligkeit und PDF später direkt ändern oder löschen.
              </div>
            </div>

            <div style={styles.item}>
              <div style={styles.itemTitle}>Lieferadressen je Firma</div>
              <div style={styles.itemMeta}>
                Firmenstandorte direkt im Admin einsehen und pflegen.
              </div>
            </div>

            <div style={styles.item}>
              <div style={styles.itemTitle}>Kostenstellen</div>
              <div style={styles.itemMeta}>
                Kostenstellen pro Firma verwalten und später bei Bestellungen nutzen.
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}