import { redirect, useLoaderData, Form } from "react-router";
import { useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendApprovalEmail(customer) {
  if (!customer?.email) return;

  await resend.emails.send({
    from:
      process.env.MAIL_FROM ||
      "Let Me Bowl Catering <onboarding@resend.dev>",
    to: customer.email,
    bcc: process.env.MAIL_BCC || undefined,
    subject: "Ihr Let Me Bowl Firmenkonto wurde freigeschaltet",
    html: `
      <div style="font-family: Arial, sans-serif; color:#171717; line-height:1.6;">
        <h2>Ihr Firmenkonto wurde freigeschaltet</h2>
        <p>Guten Tag ${customer.firstName || ""},</p>
        <p>
          vielen Dank für Ihre Registrierung. Ihr Let Me Bowl Firmenkonto wurde geprüft
          und ist nun freigeschaltet.
        </p>
        <p>
          Sie können sich ab sofort im Portal anmelden und Ihre Firmendaten,
          Rechnungen und Bestellungen verwalten.
        </p>
        <p>
          <a href="https://konto.letmebowl-catering.de/login"
             style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Zum Portal
          </a>
        </p>
        <p>Mit freundlichen Grüßen<br/>Let Me Bowl Catering</p>
      </div>
    `,
  });
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  const customers = await prisma.portalUser.findMany({
    orderBy: [{ isActive: "asc" }, { createdAt: "desc" }, { companyName: "asc" }],
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
    success,
    error,
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
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "create") {
      const companyName = String(formData.get("companyName") || "").trim();
      const firstName = String(formData.get("firstName") || "").trim();
      const lastName = String(formData.get("lastName") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const phone = String(formData.get("phone") || "").trim();
      const username = String(formData.get("username") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");

      if (!companyName || !firstName || !email || !username || !password) {
        return redirect("/admin/customers?error=missing_fields");
      }

      const existing = await prisma.portalUser.findFirst({
        where: { OR: [{ email }, { username }] },
      });

      if (existing) return redirect("/admin/customers?error=exists");

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
          role: "ORDERER",
          mustResetPassword: false,
          billing: {
            create: {
              companyName,
              contactName: `${firstName} ${lastName}`,
              email,
              phone,
            },
          },
        },
      });

      return redirect("/admin/customers?success=created");
    }

    if (intent === "approveCustomer") {
      const customerId = String(formData.get("customerId") || "");

      if (!customerId) return redirect("/admin/customers?error=missing_customer");

      const customer = await prisma.portalUser.update({
        where: { id: customerId },
        data: {
          isActive: true,
          isAdmin: false,
          role: "ORDERER",
        },
      });

      try {
        await sendApprovalEmail(customer);
      } catch (mailError) {
        console.error("APPROVAL_MAIL_ERROR:", mailError);
        return redirect("/admin/customers?success=approved_mail_failed");
      }

      return redirect("/admin/customers?success=approved");
    }

    if (intent === "toggleActive") {
      const customerId = String(formData.get("customerId") || "");
      const currentValue = String(formData.get("currentValue") || "false");

      if (!customerId) return redirect("/admin/customers?error=missing_customer");
      if (customerId === user.id) return redirect("/admin/customers?error=self_block");

      await prisma.portalUser.update({
        where: { id: customerId },
        data: { isActive: currentValue !== "true" },
      });

      return redirect("/admin/customers?success=status");
    }

    if (intent === "deleteCustomer") {
      const customerId = String(formData.get("customerId") || "");

      if (!customerId) return redirect("/admin/customers?error=missing_customer");
      if (customerId === user.id) return redirect("/admin/customers?error=self_delete");

      const customer = await prisma.portalUser.findUnique({
        where: { id: customerId },
      });

      if (!customer) return redirect("/admin/customers?error=missing_customer");
      if (customer.isAdmin) return redirect("/admin/customers?error=admin_delete");

      await prisma.portalUser.delete({ where: { id: customerId } });

      return redirect("/admin/customers?success=deleted");
    }

    return redirect("/admin/customers?error=unknown");
  } catch (error) {
    console.error("ADMIN_CUSTOMERS_ACTION_ERROR:", error);
    return redirect("/admin/customers?error=server");
  }
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function getSuccessMessage(success) {
  if (success === "created") return "Firma wurde erfolgreich angelegt.";
  if (success === "approved") return "Kundenkonto wurde freigegeben und der Kunde wurde per E-Mail informiert.";
  if (success === "approved_mail_failed") return "Kundenkonto wurde freigegeben. Die E-Mail konnte jedoch nicht versendet werden.";
  if (success === "status") return "Status wurde erfolgreich geändert.";
  if (success === "deleted") return "Kundenkonto wurde gelöscht.";
  return null;
}

function getErrorMessage(error) {
  if (error === "missing_fields") return "Bitte alle Pflichtfelder ausfüllen.";
  if (error === "exists") return "Diese E-Mail oder dieser Benutzername existiert bereits.";
  if (error === "missing_customer") return "Kundenkonto wurde nicht gefunden.";
  if (error === "self_block") return "Du kannst dein eigenes Admin-Konto nicht deaktivieren.";
  if (error === "self_delete") return "Du kannst dein eigenes Admin-Konto nicht löschen.";
  if (error === "admin_delete") return "Admin-Konten können hier nicht gelöscht werden.";
  if (error === "server") return "Aktion konnte nicht ausgeführt werden.";
  return null;
}

const styles = {
  alertSuccess: { background: "#edf7ee", color: "#1f6b36", border: "1px solid #cfe8d4", padding: "14px 16px", borderRadius: "16px", fontWeight: 800 },
  alertError: { background: "#fff4f4", color: "#8b2222", border: "1px solid #efcaca", padding: "14px 16px", borderRadius: "16px", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "22px", alignItems: "start" },
  card: { background: "#fff", border: "1px solid #e8decd", borderRadius: "24px", padding: "28px", boxShadow: "0 18px 45px rgba(30,20,10,0.05)" },
  eyebrow: { fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#b08b4f", fontWeight: 900, marginBottom: "14px" },
  h2: { margin: "0 0 12px", fontSize: "28px", letterSpacing: "-0.03em" },
  text: { margin: "0 0 22px", fontSize: "15px", lineHeight: 1.7, color: "#756b5f" },
  blackBtn: { border: 0, background: "#111", color: "#fff", padding: "14px 18px", borderRadius: "16px", fontWeight: 800, cursor: "pointer" },
  formBox: { marginTop: "22px", border: "1px solid #eadfcd", borderRadius: "22px", padding: "22px", background: "#fbf8f2" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b6258", fontWeight: 900 },
  input: { width: "100%", padding: "14px 15px", borderRadius: "15px", border: "1px solid #dfd3bf", background: "#fff", fontSize: "15px", boxSizing: "border-box" },
  actions: { display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" },
  saveBtn: { border: 0, background: "#111", color: "#fff", padding: "14px 18px", borderRadius: "16px", fontWeight: 800, cursor: "pointer" },
  cancelBtn: { border: "1px solid #dfd3bf", background: "#fff", color: "#171717", padding: "14px 18px", borderRadius: "16px", fontWeight: 800, cursor: "pointer" },
  dangerBtn: { border: "1px solid #efcaca", background: "#fff4f4", color: "#8b2222", padding: "12px 14px", borderRadius: "14px", fontWeight: 900, cursor: "pointer" },
  stats: { display: "grid", gap: "16px" },
  stat: { background: "#fff", border: "1px solid #e8decd", borderRadius: "22px", padding: "22px" },
  statLabel: { fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#756b5f", fontWeight: 900, marginBottom: "10px" },
  statValue: { fontSize: "34px", fontWeight: 900, letterSpacing: "-0.04em" },
  searchBar: { display: "grid", gridTemplateColumns: "1fr 180px", gap: "12px", marginBottom: "18px" },
  list: { display: "grid", gap: "14px" },
  customerItem: { border: "1px solid #ece5d8", borderRadius: "20px", padding: "20px", background: "#fbf8f2" },
  customerItemPending: { border: "1px solid #efdcae", background: "#fff8e8" },
  customerTop: { display: "grid", gridTemplateColumns: "1.25fr 0.55fr auto", gap: "18px", alignItems: "start" },
  company: { fontSize: "20px", fontWeight: 900, marginBottom: "8px" },
  meta: { fontSize: "14px", color: "#6b6258", lineHeight: 1.65 },
  role: { fontSize: "15px", fontWeight: 900, textAlign: "right" },
  created: { fontSize: "14px", color: "#756b5f", textAlign: "right", lineHeight: 1.5 },
  rowActions: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" },
  smallBtn: { border: "1px solid #dfd3bf", background: "#fff", color: "#171717", padding: "12px 14px", borderRadius: "14px", fontWeight: 800, cursor: "pointer" },
  darkBtn: { border: 0, background: "#111", color: "#fff", padding: "12px 14px", borderRadius: "14px", fontWeight: 800, cursor: "pointer" },
  approveBtn: { border: 0, background: "#1f6b36", color: "#fff", padding: "12px 14px", borderRadius: "14px", fontWeight: 900, cursor: "pointer" },
  badge: { display: "inline-block", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 900, marginLeft: "4px" },
  active: { background: "#edf6ed", color: "#2f6b35", border: "1px solid #cfe7cf" },
  inactive: { background: "#fbeaea", color: "#8a2d2d", border: "1px solid #efc9c9" },
  pending: { background: "#fff3d6", color: "#8a5f10", border: "1px solid #efdcae" },
};

function CustomerCard({ customer }) {
  const isPending = !customer.isActive && !customer.isAdmin;

  return (
    <div style={{ ...styles.customerItem, ...(isPending ? styles.customerItemPending : {}) }}>
      <div style={styles.customerTop}>
        <div>
          <div style={styles.company}>{customer.companyName}</div>
          <div style={styles.meta}>
            Kontakt: {customer.firstName} {customer.lastName || ""}
            <br />
            E-Mail: {customer.email}
            <br />
            Telefon: {customer.phone || "-"}
            <br />
            Benutzername: {customer.username}
            <br />
            Registriert am: {formatDate(customer.createdAt)}
            <br />
            Status:
            <span style={{ ...styles.badge, ...(isPending ? styles.pending : customer.isActive ? styles.active : styles.inactive) }}>
              {isPending ? "Wartet auf Freigabe" : customer.isActive ? "Aktiv" : "Gesperrt"}
            </span>
          </div>
        </div>

        <div style={styles.role}>{customer.isAdmin ? "ADMIN" : customer.role}</div>

        <div style={styles.created}>
          {isPending ? "Neue Registrierung" : "Kundenkonto"}
          <br />
          {formatDate(customer.createdAt)}
        </div>
      </div>

      <div style={styles.rowActions}>
        <button type="button" style={styles.darkBtn} onClick={() => { window.location.href = `/admin/customer-detail?id=${customer.id}`; }}>
          Details öffnen
        </button>

        {isPending ? (
          <Form method="post">
            <input type="hidden" name="intent" value="approveCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />
            <button type="submit" style={styles.approveBtn}>Freigeben</button>
          </Form>
        ) : null}

        {!customer.isAdmin ? (
          <Form method="post">
            <input type="hidden" name="intent" value="toggleActive" />
            <input type="hidden" name="customerId" value={customer.id} />
            <input type="hidden" name="currentValue" value={String(customer.isActive)} />
            <button type="submit" style={styles.smallBtn}>{customer.isActive ? "Sperren" : "Aktivieren"}</button>
          </Form>
        ) : null}

        {!customer.isAdmin ? (
          <Form method="post" onSubmit={(e) => { if (!window.confirm("Dieses Kundenkonto wirklich löschen? Alle zugehörigen Daten werden ebenfalls gelöscht.")) e.preventDefault(); }}>
            <input type="hidden" name="intent" value="deleteCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />
            <button type="submit" style={styles.dangerBtn}>Löschen</button>
          </Form>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const { user, customers, success, error } = useLoaderData();
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const activeCount = customers.filter((c) => c.isActive).length;
  const pendingCount = customers.filter((c) => !c.isActive && !c.isAdmin).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const isPending = !customer.isActive && !customer.isAdmin;

      const matchesQuery =
        !q ||
        customer.companyName?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.username?.toLowerCase().includes(q) ||
        customer.firstName?.toLowerCase().includes(q) ||
        customer.lastName?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && customer.isActive) ||
        (statusFilter === "PENDING" && isPending) ||
        (statusFilter === "INACTIVE" && !customer.isActive) ||
        (statusFilter === "ADMIN" && customer.isAdmin);

      return matchesQuery && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  return (
    <AdminLayout title="Firmenkunden" subtitle="Firmenkonten prüfen, freigeben und verwalten." user={user}>
      {getSuccessMessage(success) ? <div style={styles.alertSuccess}>{getSuccessMessage(success)}</div> : null}
      {getErrorMessage(error) ? <div style={styles.alertError}>{getErrorMessage(error)}</div> : null}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Kundenverwaltung</div>
          <h2 style={styles.h2}>Neue Firma manuell anlegen</h2>
          <p style={styles.text}>
            Hier kannst du Firmenkunden selbst anlegen. Registrierungen über die Website erscheinen automatisch als „Wartet auf Freigabe“.
          </p>

          <button type="button" style={styles.blackBtn} onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Formular schließen" : "Neue Firma anlegen"}
          </button>

          {showCreate && (
            <div style={styles.formBox}>
              <Form method="post">
                <input type="hidden" name="intent" value="create" />

                <div style={styles.formGrid}>
                  <div style={styles.field}><label style={styles.label}>Firma</label><input name="companyName" style={styles.input} required /></div>
                  <div style={styles.field}><label style={styles.label}>Vorname</label><input name="firstName" style={styles.input} required /></div>
                  <div style={styles.field}><label style={styles.label}>Nachname</label><input name="lastName" style={styles.input} /></div>
                  <div style={styles.field}><label style={styles.label}>E-Mail</label><input name="email" type="email" style={styles.input} required /></div>
                  <div style={styles.field}><label style={styles.label}>Telefon</label><input name="phone" style={styles.input} /></div>
                  <div style={styles.field}><label style={styles.label}>Benutzername</label><input name="username" style={styles.input} required /></div>
                  <div style={styles.field}><label style={styles.label}>Start-Passwort</label><input name="password" type="text" style={styles.input} required /></div>
                </div>

                <div style={styles.actions}>
                  <button type="submit" style={styles.saveBtn}>Firma speichern</button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowCreate(false)}>Abbrechen</button>
                </div>
              </Form>
            </div>
          )}
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}><div style={styles.statLabel}>Gesamt</div><div style={styles.statValue}>{customers.length}</div></div>
          <div style={styles.stat}><div style={styles.statLabel}>Wartet auf Freigabe</div><div style={styles.statValue}>{pendingCount}</div></div>
          <div style={styles.stat}><div style={styles.statLabel}>Aktiv</div><div style={styles.statValue}>{activeCount}</div></div>
          <div style={styles.stat}><div style={styles.statLabel}>Gesperrt</div><div style={styles.statValue}>{inactiveCount}</div></div>
        </div>
      </div>

      <section style={styles.card}>
        <div style={styles.eyebrow}>Firmenliste</div>
        <h2 style={styles.h2}>Alle Firmenkunden</h2>

        <div style={styles.searchBar}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suche nach Firma, E-Mail, Name oder Benutzername" style={styles.input} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
            <option value="ALL">Alle</option>
            <option value="PENDING">Wartet auf Freigabe</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="INACTIVE">Gesperrt</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div style={styles.list}>
          {filteredCustomers.length === 0 ? (
            <div style={styles.card}>Keine passenden Firmenkunden gefunden.</div>
          ) : (
            filteredCustomers.map((customer) => <CustomerCard key={customer.id} customer={customer} />)
          )}
        </div>
      </section>
    </AdminLayout>
  );
}