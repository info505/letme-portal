import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import bcrypt from "bcryptjs";
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
      username: true,
      isActive: true,
      role: true,
      mustResetPassword: true,
      isAdmin: true,
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
  const intent = formData.get("intent");

  if (intent === "create") {
    const companyName = formData.get("companyName");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const username = formData.get("username");
    const password = formData.get("password");
    const role = formData.get("role");

    if (!companyName || !firstName || !email || !username || !password) {
      return Response.json(
        { error: "Bitte Firma, Vorname, E-Mail, Benutzername und Passwort angeben." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    await prisma.portalUser.create({
      data: {
        companyName: String(companyName),
        firstName: String(firstName),
        lastName: lastName ? String(lastName) : "",
        email: String(email),
        phone: phone ? String(phone) : null,
        username: String(username),
        passwordHash,
        isActive: true,
        isAdmin: false,
        role: role ? String(role) : "ORDERER",
        mustResetPassword: false,
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "updateCustomer") {
    const customerId = formData.get("customerId");
    const companyName = formData.get("companyName");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const role = formData.get("role");

    if (!customerId || !companyName || !firstName || !email || !role) {
      return Response.json(
        { error: "Pflichtfelder fehlen." },
        { status: 400 }
      );
    }

    await prisma.portalUser.update({
      where: { id: String(customerId) },
      data: {
        companyName: String(companyName),
        firstName: String(firstName),
        lastName: lastName ? String(lastName) : "",
        email: String(email),
        phone: phone ? String(phone) : null,
        role: String(role),
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "toggleActive") {
    const customerId = formData.get("customerId");
    const currentValue = formData.get("currentValue");

    if (!customerId) {
      return Response.json({ error: "Konto nicht gefunden." }, { status: 400 });
    }

    await prisma.portalUser.update({
      where: { id: String(customerId) },
      data: {
        isActive: String(currentValue) !== "true",
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "resetPassword") {
    const customerId = formData.get("customerId");
    const newPassword = formData.get("newPassword");

    if (!customerId || !newPassword) {
      return Response.json(
        { error: "Neue Passwortangabe fehlt." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);

    await prisma.portalUser.update({
      where: { id: String(customerId) },
      data: {
        passwordHash,
        mustResetPassword: true,
      },
    });

    return redirect("/admin/customers");
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
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
  fieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "1 / -1",
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
  inputDisabled: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #e7dfd1",
    background: "#f5f2ec",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#666055",
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
    gap: "18px",
  },
  customerTop: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.85fr auto",
    gap: "18px",
    alignItems: "start",
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
    fontSize: "24px",
    fontWeight: 800,
    textAlign: "right",
  },
  createdBox: {
    fontSize: "15px",
    color: "#666055",
    textAlign: "right",
    lineHeight: 1.5,
  },
  customerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  smallBtn: {
    border: "1px solid #dfd3bf",
    background: "#fff",
    color: "#171717",
    padding: "12px 14px",
    borderRadius: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  strongBtn: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  resetBox: {
    marginTop: "14px",
    padding: "18px",
    borderRadius: "18px",
    background: "#fff",
    border: "1px solid #e7dfd1",
  },
};

function activeStyle(isActive) {
  if (isActive) {
    return { ...styles.badge, ...styles.badgeActive };
  }
  return { ...styles.badge, ...styles.badgeInactive };
}

function CustomerCard({ customer, navigation }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <div style={styles.customerItem}>
      <div style={styles.customerTop}>
        <div style={styles.customerMain}>
          <div style={styles.customerCompany}>{customer.companyName}</div>
          <div style={styles.customerMeta}>
            Kontakt: {customer.firstName} {customer.lastName}
            <br />
            E-Mail: {customer.email}
            <br />
            Telefon: {customer.phone || "-"}
            <br />
            Benutzername: {customer.username}
            <br />
            Passwort-Reset offen: {customer.mustResetPassword ? "Ja" : "Nein"}
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

      <div style={styles.customerActions}>
        <button
          type="button"
          style={styles.strongBtn}
          onClick={() => setShowEdit((prev) => !prev)}
        >
          {showEdit ? "Bearbeiten schließen" : "Bearbeiten"}
        </button>

        <Form method="post">
          <input type="hidden" name="intent" value="toggleActive" />
          <input type="hidden" name="customerId" value={customer.id} />
          <input type="hidden" name="currentValue" value={String(customer.isActive)} />
          <button type="submit" style={styles.smallBtn}>
            {customer.isActive ? "Deaktivieren" : "Aktivieren"}
          </button>
        </Form>

        <button
          type="button"
          style={styles.smallBtn}
          onClick={() => setShowReset((prev) => !prev)}
        >
          {showReset ? "Reset schließen" : "Passwort zurücksetzen"}
        </button>
      </div>

      {showEdit && (
        <div style={styles.resetBox}>
          <Form method="post">
            <input type="hidden" name="intent" value="updateCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Firma</label>
                <input
                  name="companyName"
                  defaultValue={customer.companyName}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Vorname</label>
                <input
                  name="firstName"
                  defaultValue={customer.firstName}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Nachname</label>
                <input
                  name="lastName"
                  defaultValue={customer.lastName}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>E-Mail</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Telefon</label>
                <input
                  name="phone"
                  defaultValue={customer.phone || ""}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Benutzername</label>
                <input
                  value={customer.username}
                  style={styles.inputDisabled}
                  disabled
                  readOnly
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Rolle</label>
                <select
                  name="role"
                  defaultValue={customer.role}
                  style={styles.input}
                >
                  <option value="ORDERER">ORDERER</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.strongBtn}>
                {navigation.state === "submitting" ? "Speichert..." : "Änderungen speichern"}
              </button>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setShowEdit(false)}
              >
                Abbrechen
              </button>
            </div>
          </Form>
        </div>
      )}

      {showReset && (
        <div style={styles.resetBox}>
          <Form method="post">
            <input type="hidden" name="intent" value="resetPassword" />
            <input type="hidden" name="customerId" value={customer.id} />

            <div style={styles.fieldFull}>
              <label style={styles.label}>Neues Passwort</label>
              <input
                name="newPassword"
                type="text"
                placeholder="Neues temporäres Passwort eingeben"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.strongBtn}>
                Passwort speichern
              </button>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setShowReset(false)}
              >
                Abbrechen
              </button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
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
          <a href="/admin" style={styles.navItem}>Dashboard</a>
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
              Firmenkonten anlegen, bearbeiten und sauber administrieren.
            </p>
          </div>
        </div>

        <div style={styles.contentGrid}>
          <div style={styles.card}>
            <div style={styles.eyebrow}>Kundenverwaltung</div>
            <h2 style={styles.heroTitle}>
              Firmenkonten sauber anlegen und vollständig verwalten.
            </h2>
            <p style={styles.heroText}>
              Benutzername bleibt fest sichtbar, kann aber nicht verändert werden.
              Passwörter werden nicht angezeigt, sondern nur sicher zurückgesetzt.
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
                  <input type="hidden" name="intent" value="create" />

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
                      <label style={styles.label}>Start-Passwort</label>
                      <input name="password" type="text" style={styles.input} required />
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
              <div style={styles.statText}>Derzeit deaktivierte Kundenkonten.</div>
            </div>
          </div>
        </div>

        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Firmenliste</h2>
          <p style={styles.sectionText}>
            Hier verwaltest du Firmenkonten, Rollen, Aktivstatus und Passwort-Resets.
          </p>

          <div style={styles.customerList}>
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                navigation={navigation}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}