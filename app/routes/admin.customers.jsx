import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/");

  const customers = await prisma.portalUser.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    user,
    customers: customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function action({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/");

  const formData = await request.formData();

  const companyName = formData.get("companyName");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const username = formData.get("username");
  const passwordHash = formData.get("passwordHash");
  const role = formData.get("role");

  if (!companyName || !firstName || !email || !username || !passwordHash) {
    return Response.json(
      { error: "Bitte Firma, Vorname, E-Mail, Benutzername und Passwort angeben." },
      { status: 400 }
    );
  }

  await prisma.portalUser.create({
    data: {
      companyName: String(companyName),
      firstName: String(firstName),
      lastName: lastName ? String(lastName) : "",
      email: String(email),
      phone: phone ? String(phone) : null,
      username: String(username),
      passwordHash: String(passwordHash),
      isActive: true,
      isAdmin: false,
      role: role ? String(role) : "ORDERER",
    },
  });

  return redirect("/admin/customers");
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
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
    gridTemplateColumns: "1.15fr 0.95fr",
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
  createToggle: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  formBox: {
    marginTop: "20px",
    border: "1px solid #eadfcd",
    borderRadius: "22px",
    padding: "22px",
    background: "#fbf8f2",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#666055",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #dfd3bf",
    background: "#fff",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  saveBtn: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "14px 18px",
    borderRadius: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelBtn: {
    border: "1px solid #dfd3bf",
    background: "#fff",
    color: "#171717",
    padding: "14px 18px",
    borderRadius: "16px",
    fontWeight: 700,
    cursor: "pointer",
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
  customerList: {
    display: "grid",
    gap: "16px",
  },
  customerItem: {
    border: "1px solid #ece5d8",
    borderRadius: "20px",
    padding: "22px",
    background: "#fbf8f2",
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr auto",
    gap: "18px",
    alignItems: "center",
  },
  customerMain: {
    display: "grid",
    gap: "8px",
  },
  customerCompany: {
    fontSize: "22px",
    fontWeight: 800,
  },
  customerMeta: {
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
  roleBox: {
    fontSize: "26px",
    fontWeight: 800,
    textAlign: "right",
  },
  createdBox: {
    fontSize: "15px",
    color: "#666055",
    textAlign: "right",
    lineHeight: 1.5,
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

function activeStyle(isActive) {
  if (isActive) {
    return { ...styles.badge, ...styles.badgeActive };
  }
  return { ...styles.badge, ...styles.badgeInactive };
}

export default function AdminCustomersPage() {
  const { user, customers } = useLoaderData();
  const [showCreate, setShowCreate] = useState(false);
  const navigation = useNavigation();

  const activeCount = customers.filter((c) => c.isActive).length;
  const inactiveCount = customers.length - activeCount;

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
          <a href="/admin/customers" style={{ ...styles.navItem, ...styles.navItemActive }}>
            Firmenkunden
          </a>
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
            <h1 style={styles.title}>Firmenkunden</h1>
            <p style={styles.subtitle}>
              Firmenkonten anlegen und strukturiert für das LMB-Portal verwalten.
            </p>
          </div>

          <div style={styles.langWrap}>
            <div style={{ ...styles.lang, ...styles.langActive }}>DE</div>
            <div style={styles.lang}>EN</div>
          </div>
        </div>

        <div style={styles.contentGrid}>
          <div style={styles.card}>
            <div style={styles.eyebrow}>Kundenverwaltung</div>
            <h2 style={styles.heroTitle}>
              Neue Firmenkonten sauber anlegen und direkt im Portal verwalten.
            </h2>
            <p style={styles.heroText}>
              Hier erstellst du neue Kundenkonten für Firmen. Diese Konten können
              später Rechnungen, Lieferadressen, Kostenstellen und Bestellungen
              verwalten.
            </p>

            <button
              type="button"
              style={styles.createToggle}
              onClick={() => setShowCreate((prev) => !prev)}
            >
              {showCreate ? "Formular schließen" : "Neue Firma anlegen"}
            </button>

            {showCreate && (
              <div style={styles.formBox}>
                <Form method="post">
                  <div style={styles.formGrid}>
                    <div style={styles.field}>
                      <label style={styles.label}>Firma</label>
                      <input name="companyName" style={styles.input} required />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Vorname</label>
                      <input name="firstName" style={styles.input} required />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Nachname</label>
                      <input name="lastName" style={styles.input} />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>E-Mail</label>
                      <input name="email" type="email" style={styles.input} required />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Telefon</label>
                      <input name="phone" style={styles.input} />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Benutzername</label>
                      <input name="username" style={styles.input} required />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Passwort</label>
                      <input name="passwordHash" style={styles.input} required />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Rolle</label>
                      <select name="role" style={styles.input} defaultValue="ORDERER">
                        <option value="ORDERER">ORDERER</option>
                        <option value="FINANCE">FINANCE</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.formActions}>
                    <button type="submit" style={styles.saveBtn}>
                      {navigation.state === "submitting"
                        ? "Speichert..."
                        : "Firma speichern"}
                    </button>

                    <button
                      type="button"
                      style={styles.cancelBtn}
                      onClick={() => setShowCreate(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </Form>
              </div>
            )}
          </div>

          <div style={styles.statCol}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Gesamt</div>
              <div style={styles.statValue}>{customers.length}</div>
              <div style={styles.statText}>Aktuell angelegte Firmenkonten.</div>
            </div>

            <div style={{ ...styles.statBox, ...styles.statBoxGreen }}>
              <div style={styles.statLabel}>Aktiv</div>
              <div style={styles.statValue}>{activeCount}</div>
              <div style={styles.statText}>Aktuell aktive Kundenkonten.</div>
            </div>

            <div style={{ ...styles.statBox, ...styles.statBoxGold }}>
              <div style={styles.statLabel}>Inaktiv</div>
              <div style={styles.statValue}>{inactiveCount}</div>
              <div style={styles.statText}>Derzeit nicht aktive Kundenkonten.</div>
            </div>
          </div>
        </div>

        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Firmenliste</h2>
          <p style={styles.sectionText}>
            Hier siehst du alle angelegten Firmenkonten mit Kontaktinformationen,
            Status und Rolle.
          </p>

          {customers.length === 0 ? (
            <div style={styles.emptyBox}>
              <h3 style={styles.emptyTitle}>Noch keine Firmenkunden vorhanden</h3>
              <p style={styles.emptyText}>
                Sobald du Firmenkonten anlegst, erscheinen sie hier automatisch.
              </p>
            </div>
          ) : (
            <div style={styles.customerList}>
              {customers.map((customer) => (
                <div key={customer.id} style={styles.customerItem}>
                  <div style={styles.customerMain}>
                    <div style={styles.customerCompany}>{customer.companyName}</div>
                    <div style={styles.customerMeta}>
                      Kontakt: {customer.firstName} {customer.lastName}
                      <br />
                      E-Mail: {customer.email}
                      <br />
                      Telefon: {customer.phone || "-"}
                      <br />
                      Status:{" "}
                      <span style={activeStyle(customer.isActive)}>
                        {customer.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </div>

                  <div style={styles.roleBox}>{customer.role}</div>

                  <div style={styles.createdBox}>
                    Angelegt am
                    <br />
                    {formatDate(customer.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}