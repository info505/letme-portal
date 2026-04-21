import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function euro(value) {
  if (value === null || value === undefined) return "0,00 €";
  const num = Number(value);
  if (Number.isNaN(num)) return "0,00 €";
  return num.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  const invoices = await prisma.portalInvoice.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalCount = invoices.length;
  const paidCount = invoices.filter((inv) => inv.status === "BEZAHLT").length;
  const openInvoices = invoices.filter((inv) => inv.status !== "BEZAHLT");

  const openAmount = openInvoices.reduce((sum, inv) => {
    const value = inv.amountGross ? Number(inv.amountGross) : 0;
    return sum + value;
  }, 0);

  return {
    user,
    invoices: invoices.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      issueDate: inv.issueDate ? inv.issueDate.toISOString() : null,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      amountGross: inv.amountGross ? inv.amountGross.toString() : null,
    })),
    stats: {
      totalCount,
      paidCount,
      openCount: openInvoices.length,
      openAmount,
    },
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
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.95fr",
    gap: "22px",
    alignItems: "start",
  },
  card: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "24px",
    padding: "34px",
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
    marginBottom: "22px",
    fontWeight: 700,
    background: "#fbf8f2",
  },
  heroTitle: {
    margin: "0 0 18px 0",
    fontSize: "34px",
    lineHeight: 1.15,
    fontWeight: 800,
  },
  heroText: {
    margin: "0 0 28px 0",
    fontSize: "18px",
    lineHeight: 1.7,
    color: "#575247",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "200px 1fr",
    rowGap: "0",
    columnGap: "0",
    borderTop: "1px solid #ece5d8",
    marginTop: "10px",
  },
  infoLabel: {
    padding: "18px 0",
    borderBottom: "1px solid #ece5d8",
    color: "#696258",
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  infoValue: {
    padding: "18px 0",
    borderBottom: "1px solid #ece5d8",
    fontWeight: 700,
    fontSize: "18px",
  },
  statCol: {
    display: "grid",
    gap: "18px",
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
  sectionCard: {
    marginTop: "24px",
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "24px",
    padding: "34px",
  },
  sectionTitle: {
    margin: "0 0 14px 0",
    fontSize: "34px",
    fontWeight: 800,
  },
  sectionText: {
    margin: "0 0 26px 0",
    fontSize: "18px",
    lineHeight: 1.7,
    color: "#666055",
  },
  invoiceList: {
    display: "grid",
    gap: "16px",
  },
  invoiceItem: {
    border: "1px solid #ece5d8",
    borderRadius: "20px",
    padding: "22px",
    background: "#fbf8f2",
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr auto",
    gap: "18px",
    alignItems: "center",
  },
  invoiceMain: {
    display: "grid",
    gap: "8px",
  },
  invoiceNumber: {
    fontSize: "22px",
    fontWeight: 800,
  },
  invoiceMeta: {
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
  invoiceAmount: {
    fontSize: "26px",
    fontWeight: 800,
    textAlign: "right",
  },
  openLink: {
    display: "inline-block",
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "14px 18px",
    borderRadius: "16px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  emptyBox: {
    border: "1px dashed #e1d8ca",
    borderRadius: "22px",
    padding: "26px",
    background: "#fffdfa",
  },
  emptyTitle: {
    margin: "0 0 12px 0",
    fontSize: "24px",
    fontWeight: 800,
  },
  emptyText: {
    margin: 0,
    fontSize: "18px",
    lineHeight: 1.7,
    color: "#666055",
  },
};

function statusLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

function statusStyle(status) {
  if (status === "BEZAHLT") {
    return { ...styles.badge, ...styles.badgePaid };
  }
  if (status === "UEBERFAELLIG") {
    return { ...styles.badge, ...styles.badgeOverdue };
  }
  return { ...styles.badge, ...styles.badgeOpen };
}

export default function RechnungenPage() {
  const { user, invoices, stats } = useLoaderData();

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>LET ME BOWL</div>

        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {(user.firstName?.[0] || user.companyName?.[0] || "A").toUpperCase()}
          </div>
          <div style={styles.profileName}>
            {user.firstName} {user.lastName}
          </div>
          <div style={styles.profileRole}>{user.companyName}</div>
        </div>

        <nav style={styles.nav}>
          <a href="/konto?lang=de" style={styles.navItem}>Konto</a>
          <a href="/bestellungen?lang=de" style={styles.navItem}>Bestellungen</a>
          <a href="/rechnungsadresse?lang=de" style={styles.navItem}>Rechnungsadresse</a>
          <a href="/lieferadressen?lang=de" style={styles.navItem}>Lieferadressen</a>
          <a href="/kostenstellen?lang=de" style={styles.navItem}>Kostenstellen</a>
          <a href="/rechnungen?lang=de" style={{ ...styles.navItem, ...styles.navItemActive }}>
            Rechnungen
          </a>
        </nav>

        <div style={styles.actions}>
          <a href="https://letmebowl-catering.de" style={styles.primaryBtn}>
            Jetzt bestellen
          </a>
          <a href="/logout" style={styles.secondaryBtn}>
            Abmelden
          </a>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.titleWrap}>
            <h1 style={styles.title}>Rechnungen</h1>
            <p style={styles.subtitle}>
              Alle Rechnungen und Zahlungsstände deines Firmenkontos.
            </p>
          </div>

          <div style={styles.langWrap}>
            <div style={{ ...styles.lang, ...styles.langActive }}>DE</div>
            <div style={styles.lang}>EN</div>
          </div>
        </div>

        <div style={styles.contentGrid}>
          <div style={styles.card}>
            <div style={styles.eyebrow}>Rechnungsbereich</div>
            <h2 style={styles.heroTitle}>
              Rechnungen sauber pro Firmenkonto bereitstellen.
            </h2>
            <p style={styles.heroText}>
              Hier erscheinen ausschließlich Rechnungen, die deinem aktuellen
              Kundenkonto direkt zugeordnet wurden.
            </p>

            <div style={styles.infoGrid}>
              <div style={styles.infoLabel}>Firma</div>
              <div style={styles.infoValue}>{user.companyName}</div>

              <div style={styles.infoLabel}>Kontakt</div>
              <div style={styles.infoValue}>
                {user.firstName} {user.lastName}
              </div>

              <div style={styles.infoLabel}>E-Mail</div>
              <div style={styles.infoValue}>{user.email}</div>
            </div>
          </div>

          <div style={styles.statCol}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Gesamt</div>
              <div style={styles.statValue}>{stats.totalCount}</div>
              <div style={styles.statText}>Aktuell sichtbare Rechnungen.</div>
            </div>

            <div style={{ ...styles.statBox, ...styles.statBoxGreen }}>
              <div style={styles.statLabel}>Bezahlt</div>
              <div style={styles.statValue}>{stats.paidCount}</div>
              <div style={styles.statText}>Bereits beglichene Rechnungen.</div>
            </div>

            <div style={{ ...styles.statBox, ...styles.statBoxGold }}>
              <div style={styles.statLabel}>Offen</div>
              <div style={styles.statValue}>{stats.openCount}</div>
              <div style={styles.statText}>Noch nicht bezahlte Rechnungen.</div>
            </div>

            <div style={styles.statBox}>
              <div style={styles.statLabel}>Offener Betrag</div>
              <div style={styles.statValue}>{euro(stats.openAmount)}</div>
              <div style={styles.statText}>Noch ausstehender Gesamtbetrag.</div>
            </div>
          </div>
        </div>

        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Rechnungen</h2>
          <p style={styles.sectionText}>
            Hier findest du alle deinem Firmenkonto zugeordneten PDF-Rechnungen.
          </p>

          {invoices.length === 0 ? (
            <div style={styles.emptyBox}>
              <h3 style={styles.emptyTitle}>Noch keine Rechnungen hinterlegt</h3>
              <p style={styles.emptyText}>
                Sobald deinem Konto Rechnungen zugeordnet wurden, erscheinen sie
                genau hier.
              </p>
            </div>
          ) : (
            <div style={styles.invoiceList}>
              {invoices.map((inv) => (
                <div key={inv.id} style={styles.invoiceItem}>
                  <div style={styles.invoiceMain}>
                    <div style={styles.invoiceNumber}>{inv.invoiceNumber}</div>
                    <div style={styles.invoiceMeta}>
                      Rechnungsdatum: {formatDate(inv.issueDate || inv.createdAt)}
                      <br />
                      Fällig am: {formatDate(inv.dueDate)}
                      <br />
                      Status:{" "}
                      <span style={statusStyle(inv.status)}>
                        {statusLabel(inv.status)}
                      </span>
                    </div>
                  </div>

                  <div style={styles.invoiceAmount}>
                    {inv.amountGross ? euro(inv.amountGross) : "—"}
                  </div>

                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.openLink}
                  >
                    PDF öffnen
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}