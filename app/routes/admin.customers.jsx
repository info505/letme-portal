import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

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
  if (!user.isAdmin) throw redirect("/dashboard");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const companyName = String(formData.get("companyName") || "").trim();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "ORDERER");

    if (!companyName || !firstName || !email || !username || !password) {
      return Response.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.portalUser.create({
      data: {
        companyName,
        firstName,
        lastName,
        email,
        phone: phone || null,
        username,
        passwordHash,
        isActive: true,
        isAdmin: false,
        role,
        mustResetPassword: false,
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "updateCustomer") {
    const customerId = String(formData.get("customerId") || "");
    const companyName = String(formData.get("companyName") || "").trim();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const role = String(formData.get("role") || "ORDERER");

    if (!customerId || !companyName || !firstName || !email) {
      return Response.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
    }

    await prisma.portalUser.update({
      where: { id: customerId },
      data: {
        companyName,
        firstName,
        lastName,
        email,
        phone: phone || null,
        role,
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "toggleActive") {
    const customerId = String(formData.get("customerId") || "");
    const currentValue = String(formData.get("currentValue") || "false");

    if (!customerId) {
      return Response.json({ error: "Konto nicht gefunden." }, { status: 400 });
    }

    await prisma.portalUser.update({
      where: { id: customerId },
      data: {
        isActive: currentValue !== "true",
      },
    });

    return redirect("/admin/customers");
  }

  if (intent === "resetPassword") {
    const customerId = String(formData.get("customerId") || "");
    const newPassword = String(formData.get("newPassword") || "");

    if (!customerId || !newPassword) {
      return Response.json({ error: "Passwort fehlt." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.portalUser.update({
      where: { id: customerId },
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: "22px",
    alignItems: "start",
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
  blackBtn: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "14px 18px",
    borderRadius: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  formBox: {
    marginTop: "22px",
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
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b6258",
    fontWeight: 900,
  },
  input: {
    width: "100%",
    padding: "14px 15px",
    borderRadius: "15px",
    border: "1px solid #dfd3bf",
    background: "#fff",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  inputDisabled: {
    width: "100%",
    padding: "14px 15px",
    borderRadius: "15px",
    border: "1px solid #e7dfd1",
    background: "#f5f2ec",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#756b5f",
  },
  actions: {
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
    fontWeight: 800,
    cursor: "pointer",
  },
  cancelBtn: {
    border: "1px solid #dfd3bf",
    background: "#fff",
    color: "#171717",
    padding: "14px 18px",
    borderRadius: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  stats: {
    display: "grid",
    gap: "16px",
  },
  stat: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "22px",
    padding: "22px",
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
  list: {
    display: "grid",
    gap: "14px",
  },
  customerItem: {
    border: "1px solid #ece5d8",
    borderRadius: "20px",
    padding: "20px",
    background: "#fbf8f2",
  },
  customerTop: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.55fr auto",
    gap: "18px",
    alignItems: "start",
  },
  company: {
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "8px",
  },
  meta: {
    fontSize: "14px",
    color: "#6b6258",
    lineHeight: 1.65,
  },
  role: {
    fontSize: "15px",
    fontWeight: 900,
    textAlign: "right",
  },
  created: {
    fontSize: "14px",
    color: "#756b5f",
    textAlign: "right",
    lineHeight: 1.5,
  },
  rowActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  smallBtn: {
    border: "1px solid #dfd3bf",
    background: "#fff",
    color: "#171717",
    padding: "12px 14px",
    borderRadius: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  darkBtn: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: "14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
    marginLeft: "4px",
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
  editBox: {
    marginTop: "16px",
    padding: "18px",
    borderRadius: "18px",
    background: "#fff",
    border: "1px solid #e7dfd1",
  },
};

function CustomerCard({ customer, navigation }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <div style={styles.customerItem}>
      <div style={styles.customerTop}>
        <div>
          <div style={styles.company}>{customer.companyName}</div>
          <div style={styles.meta}>
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
            Status:
            <span
              style={{
                ...styles.badge,
                ...(customer.isActive ? styles.active : styles.inactive),
              }}
            >
              {customer.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        </div>

        <div style={styles.role}>{customer.role}</div>

        <div style={styles.created}>
          Angelegt am
          <br />
          {formatDate(customer.createdAt)}
        </div>
      </div>

      <div style={styles.rowActions}>
        <button
          type="button"
          style={styles.darkBtn}
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
        <div style={styles.editBox}>
          <Form method="post">
            <input type="hidden" name="intent" value="updateCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Firma</label>
                <input name="companyName" defaultValue={customer.companyName} style={styles.input} required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Vorname</label>
                <input name="firstName" defaultValue={customer.firstName} style={styles.input} required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Nachname</label>
                <input name="lastName" defaultValue={customer.lastName || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>E-Mail</label>
                <input name="email" type="email" defaultValue={customer.email} style={styles.input} required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Telefon</label>
                <input name="phone" defaultValue={customer.phone || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Benutzername</label>
                <input value={customer.username} style={styles.inputDisabled} disabled readOnly />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Rolle</label>
                <select name="role" defaultValue={customer.role} style={styles.input}>
                  <option value="ORDERER">ORDERER</option>
                  <option value="FINANCE">FINANCE</option>
                </select>
              </div>
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.darkBtn}>
                {navigation.state === "submitting" ? "Speichert..." : "Änderungen speichern"}
              </button>
              <button type="button" style={styles.cancelBtn} onClick={() => setShowEdit(false)}>
                Abbrechen
              </button>
            </div>
          </Form>
        </div>
      )}

      {showReset && (
        <div style={styles.editBox}>
          <Form method="post">
            <input type="hidden" name="intent" value="resetPassword" />
            <input type="hidden" name="customerId" value={customer.id} />

            <div style={styles.fieldFull}>
              <label style={styles.label}>Neues temporäres Passwort</label>
              <input
                name="newPassword"
                type="text"
                placeholder="z. B. LMB-Start-2026!"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.darkBtn}>
                Passwort speichern
              </button>
              <button type="button" style={styles.cancelBtn} onClick={() => setShowReset(false)}>
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
    <AdminLayout
      title="Firmenkunden"
      subtitle="Firmenkonten anlegen, bearbeiten und Zugänge verwalten."
      user={user}
    >
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Kundenverwaltung</div>
          <h2 style={styles.h2}>Neue Firma anlegen</h2>
          <p style={styles.text}>
            Lege Firmenkunden mit eigenem Login an. Benutzername bleibt fest,
            Passwörter werden sicher gespeichert und können nur zurückgesetzt werden.
          </p>

          <button
            type="button"
            style={styles.blackBtn}
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

                <div style={styles.actions}>
                  <button type="submit" style={styles.saveBtn}>
                    {navigation.state === "submitting" ? "Speichert..." : "Firma speichern"}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                    Abbrechen
                  </button>
                </div>
              </Form>
            </div>
          )}
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Gesamt</div>
            <div style={styles.statValue}>{customers.length}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Aktiv</div>
            <div style={styles.statValue}>{activeCount}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Inaktiv</div>
            <div style={styles.statValue}>{inactiveCount}</div>
          </div>
        </div>
      </div>

      <section style={styles.card}>
        <div style={styles.eyebrow}>Firmenliste</div>
        <h2 style={styles.h2}>Alle Firmenkunden</h2>

        <div style={styles.list}>
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              navigation={navigation}
            />
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}