import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

function euro(value) {
  if (value === null || value === undefined) return "0,00 €";
  const num = Number(value);
  if (Number.isNaN(num)) return "0,00 €";
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
  if (!user.isAdmin) throw redirect("/");

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
    const value = inv.amountGross ? Number(inv.amountGross) : 0;
    return sum + value;
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
  page: {
    minHeight: "100vh",
    background: "#f7f4ee",
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    fontFamily: "Arial, sans-serif",
    color: "#171717",
  },
  sidebar: {
    background: "#fff",
    borderRight: "1px solid #e7dfd1",
    padding: "30px 22px",
  },
  logo: {
    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    marginBottom: "24px",
  },
  profileCard: {
    border: "1px solid #eadfcd",
    borderRadius: "22px",
    padding: "18px",
    background: "#fbf8f2",
    marginBottom: "28px",
  },
  avatar: {
    width: "52px",
    height: "52px",
    borderRadius: "999px",
    border: "1px solid #eadfcd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "18px",
    marginBottom: "14px",
    color: "#7d6231",
    background: "#fff",
  },
  profileName: {
    fontSize: "16px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  profileRole: {
    fontSize: "14px",
    color: "#6b655d",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "26px",
  },
  navItem: {
    display: "block",
    padding: "16px 18px",
    borderRadius: "18px",
    textDecoration: "none",
    color: "#2b2b2b",
    fontSize: "16px",
    fontWeight: 600,
  },
  navItemActive: {
    background: "#f5efe3",
    border: "1px solid #e5d6bd",
  },
  actions: {
    marginTop: "30px",
    display: "grid",
    gap: "14px",
  },
  primaryBtn: {
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "18px",
    fontWeight: 700,
  },
  secondaryBtn: {
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    background: "#fff",
    color: "#8f2f1d",
    padding: "16px 20px",
    borderRadius: "18px",
    fontWeight: 700,
    border: "1px solid #eadfcd",
  },
  main: {
    padding: "28px 30px",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "26px",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  title: {
    margin: 0,
    fontSize: "52px",
    lineHeight: 1.05,
    fontWeight: 800,
  },
  subtitle: {
    margin: 0,
    fontSize: "18px",
    color: "#666055",
  },
  langWrap: {
    display: "flex",
    gap: "10px",
    background: "#f4efe6",
    border: "1px solid #eadfcd",
    padding: "6px",
    borderRadius: "999px",
  },
  lang: {
    padding: "12px 18px",
    borderRadius: "999px",
    fontWeight: 700,
    color: "#5f574d",
  },
  langActive: {
    background: "#fff",
    color: "#171717",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  statBox: {
    border: "1px solid #e7dfd1",
    borderRadius: "24px",
    padding: "26px 24px",
    background: "#fff",
  },
  statBoxGreen: {
    background: "#edf6ed",
    border: "1px solid #cfe7cf",
  },
  statBoxGold: {
    background: "#fbf3e3",
    border: "1px solid #efdcae",
  },
  statLabel: {
    fontSize: "14px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#666055",
    fontWeight: 800,
    marginBottom: "10px",
  },
  statValue: {
    fontSize: "42px",
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: "10px",
  },
  statText: {
    fontSize: "16px",
    color: "#666055",
    lineHeight: 1.5,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "24px",
    padding: "30px",
  },
  eyebrow: {
    display: "inline-block",
    fontSize: "14px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#b08b4f",
    border: "1px solid #eadfcd",
    borderRadius: "999px",
    padding: "10px 16px",
    marginBottom: "20px",
    fontWeight: 700,
    background: "#fbf8f2",
  },
  cardTitle: {
    margin: "0 0 12px 0",
    fontSize: "32px",
    fontWeight: 800,
  },
  cardText: {
    margin: "0 0 22px 0",
    fontSize: "17px",
    lineHeight: 1.7,
    color: "#666055",
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
    padding: "16px 18px",
    borderRadius: "18px",
    fontWeight: 700,
  },
  list: {
    display: "grid",
    gap: "14px",
  },
  item: {
    border: "1px solid #ece5d8",
    borderRadius: "20px",
    padding: "20px",
    background: "#fbf8f2",
  },
  itemTitle: {
    fontSize: "20px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  itemMeta: {
    fontSize: "15px",
    color: "#666055",
    lineHeight: 1.6,
  },
  badge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    marginTop: "10px",
  },
  badgeActive: {
    background: "#edf6ed",
    color: "#2f6b35",
    border: "1px solid #cfe7cf",
  },
  badgeInactive: {
    background: "#fbeaea",
    color: "#8a2d2d",
    border: "1px solid #efc9c9",
  },
  badgeOpen: {
    background: "#fbf3e3",
    color: "#7a5a18",
    border: "1px solid #efdcae",
  },
  badgePaid: {
    background: "#edf6ed",
    color: "#2f6b35",
    border: "1px solid #cfe7cf",
  },
  badgeOverdue: {
    background: "#fbeaea",
    color: "#8a2d2d",
    border: "1px solid #efc9c9",
  },
};

function activeBadge(isActive) {
  if (isActive) return { ...styles.badge, ...styles.badgeActive };
  return { ...styles.badge, ...styles.badgeInactive };
}

function invoiceBadge(status) {
  if (status === "BEZAHLT") return { ...styles.badge, ...styles.badgePaid };
  if (status === "UEBERFAELLIG") return { ...styles.badge, ...styles.badgeOverdue };
  return { ...styles.badge, ...styles.badgeOpen };
}

function invoiceLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

export default function AdminDashboardPage() {
  const { user, stats, customers, invoices } = useLoaderData();

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>LET ME BOWL</div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {(user.firstName?.[0] || user.email?.[0] || "A").toUpperCase()}
          </div>
          <div style={styles.profileName}>
            {user.firstName} {user.lastName}
          </div>
          <div style={styles.profileRole}>Admin</div>
        </div>

        <nav style={styles.nav}>
          <a href="/admin" style={{ ...styles.navItem, ...styles.navItemActive }}>
            Dashboard
          </a>
          <a href="/admin/customers" style={styles.navItem}>Firmenkunden</a>
          <a href="/admin/invoices" style={styles.navItem}>Rechnungen</a>
        </nav>

        <div style={styles.actions}>
          <a href="https://letmebowl-catering.de" style={styles.primaryBtn}>
            Zur Website
          </a>
          <a href="/logout" style={styles.secondaryBtn}>
            Abmelden
          </a>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>
              Überblick über Firmenkunden, Rechnungen und offene Beträge.
            </p>
          </div>

          <div style={styles.langWrap}>
            <div style={{ ...styles.lang, ...styles.langActive }}>DE</div>
            <div style={styles.lang}>EN</div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Firmenkonten</div>
            <div style={styles.statValue}>{stats.customerCount}</div>
            <div style={styles.statText}>Gesamte Kundenkonten im Portal.</div>
          </div>

          <div style={{ ...styles.statBox, ...styles.statBoxGreen }}>
            <div style={styles.statLabel}>Aktiv</div>
            <div style={styles.statValue}>{stats.activeCustomerCount}</div>
            <div style={styles.statText}>Aktiv nutzbare Firmenkonten.</div>
          </div>

          <div style={{ ...styles.statBox, ...styles.statBoxGold }}>
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
            <h2 style={styles.cardTitle}>Admin-Aktionen</h2>
            <p style={styles.cardText}>
              Von hier aus kannst du direkt neue Firmenkonten anlegen oder Rechnungen
              hochladen und verwalten.
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
            <h2 style={styles.cardTitle}>Neueste Kunden</h2>

            {customers.length === 0 ? (
              <p style={styles.cardText}>Noch keine Firmenkunden vorhanden.</p>
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
                    <span style={activeBadge(customer.isActive)}>
                      {customer.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.eyebrow}>Letzte Rechnungen</div>
            <h2 style={styles.cardTitle}>Neueste Uploads</h2>

            {invoices.length === 0 ? (
              <p style={styles.cardText}>Noch keine Rechnungen vorhanden.</p>
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
                    <span style={invoiceBadge(invoice.status)}>
                      {invoiceLabel(invoice.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.eyebrow}>Status</div>
            <h2 style={styles.cardTitle}>Was ein Admin hier können sollte</h2>
            <p style={styles.cardText}>
              Das Fundament steht. Als Nächstes sind vor allem Pflege, Freischaltung
              und saubere Verwaltung wichtig.
            </p>

            <div style={styles.list}>
              <div style={styles.item}>
                <div style={styles.itemTitle}>Firmenkonten pflegen</div>
                <div style={styles.itemMeta}>
                  Firmen anlegen, deaktivieren, Kontakt ändern, Rollen setzen.
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemTitle}>Rechnungen zuordnen</div>
                <div style={styles.itemMeta}>
                  PDF hochladen, Status setzen, Betrag und Fälligkeit pflegen.
                </div>
              </div>

              <div style={styles.item}>
                <div style={styles.itemTitle}>Später sinnvoll</div>
                <div style={styles.itemMeta}>
                  Bestellungen prüfen, Kostenstellen verwalten, Ansprechpartner und
                  Lieferadressen je Firma bearbeiten.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}