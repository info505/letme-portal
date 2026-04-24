import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import path from "path";
import fs from "fs/promises";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function euro(value) {
  const num = Number(value || 0);
  return num.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function statusLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
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
    display: "inline-block",
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
  invoiceItem: {
    border: "1px solid #ece5d8",
    borderRadius: "20px",
    padding: "20px",
    background: "#fbf8f2",
    display: "grid",
    gridTemplateColumns: "1.3fr 0.6fr auto",
    gap: "18px",
    alignItems: "center",
  },
  invoiceNumber: {
    fontSize: "20px",
    fontWeight: 900,
    marginBottom: "8px",
  },
  meta: {
    fontSize: "14px",
    color: "#6b6258",
    lineHeight: 1.6,
  },
  amount: {
    fontSize: "22px",
    fontWeight: 900,
    textAlign: "right",
  },
  pdfBtn: {
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "13px 16px",
    borderRadius: "15px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 900,
    background: "#fbf3e3",
    color: "#7a5a18",
    border: "1px solid #efdcae",
  },
  empty: {
    border: "1px dashed #dfd3bf",
    borderRadius: "20px",
    padding: "24px",
    color: "#756b5f",
    background: "#fffdfa",
  },
};

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const portalUsers = await prisma.portalUser.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  const invoices = await prisma.portalInvoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          companyName: true,
          email: true,
        },
      },
    },
  });

  const openInvoices = invoices.filter((inv) => inv.status !== "BEZAHLT");
  const paidCount = invoices.filter((inv) => inv.status === "BEZAHLT").length;

  const openAmount = openInvoices.reduce((sum, inv) => {
    return sum + Number(inv.amountGross || 0);
  }, 0);

  return {
    user,
    portalUsers,
    invoices: invoices.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      issueDate: inv.issueDate ? inv.issueDate.toISOString() : null,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      amountGross: inv.amountGross ? inv.amountGross.toString() : null,
    })),
    stats: {
      totalCount: invoices.length,
      paidCount,
      openCount: openInvoices.length,
      openAmount,
    },
  };
}

export async function action({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const formData = await request.formData();

  const userId = formData.get("userId");
  const invoiceNumber = formData.get("invoiceNumber");
  const amountGross = formData.get("amountGross");
  const issueDate = formData.get("issueDate");
  const dueDate = formData.get("dueDate");
  const status = formData.get("status");
  const file = formData.get("pdf");

  if (!userId || !invoiceNumber || !(file instanceof File)) {
    return Response.json({ error: "Fehlende Daten" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "uploads", "invoices");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const pdfUrl = `/uploads/invoices/${filename}`;

  await prisma.portalInvoice.create({
    data: {
      userId: String(userId),
      invoiceNumber: String(invoiceNumber),
      pdfUrl,
      amountGross: amountGross
        ? Number(String(amountGross).replace(",", "."))
        : null,
      issueDate: issueDate ? new Date(String(issueDate)) : null,
      dueDate: dueDate ? new Date(String(dueDate)) : null,
      status: status ? String(status) : "OFFEN",
      originalName: file.name,
    },
  });

  return redirect("/admin/invoices");
}

export default function AdminInvoicesPage() {
  const { user, portalUsers, invoices, stats } = useLoaderData();
  const [showUpload, setShowUpload] = useState(false);
  const navigation = useNavigation();

  return (
    <AdminLayout
      title="Rechnungen"
      subtitle="PDF-Rechnungen hochladen, Firmen zuordnen und Zahlungsstatus verwalten."
      user={user}
    >
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.eyebrow}>Rechnungsverwaltung</div>

          <h2 style={styles.h2}>Neue Rechnung hochladen</h2>

          <p style={styles.text}>
            Lade eine PDF hoch und ordne sie direkt einem Firmenkunden zu. Der
            Kunde sieht danach nur seine eigenen Rechnungen im Kundenportal.
          </p>

          <button
            type="button"
            style={styles.blackBtn}
            onClick={() => setShowUpload((prev) => !prev)}
          >
            {showUpload ? "Upload schließen" : "Rechnung hochladen"}
          </button>

          {showUpload && (
            <div style={styles.formBox}>
              <Form method="post" encType="multipart/form-data">
                <div style={styles.formGrid}>
                  <div style={styles.field}>
                    <label style={styles.label}>Kundenkonto</label>
                    <select
                      name="userId"
                      style={styles.input}
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Kunde wählen
                      </option>
                      {portalUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.companyName || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Rechnungsnummer</label>
                    <input
                      name="invoiceNumber"
                      style={styles.input}
                      placeholder="z. B. 105858"
                      required
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Betrag brutto</label>
                    <input
                      name="amountGross"
                      type="number"
                      step="0.01"
                      style={styles.input}
                      placeholder="z. B. 149.90"
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Status</label>
                    <select name="status" style={styles.input} defaultValue="OFFEN">
                      <option value="OFFEN">Offen</option>
                      <option value="BEZAHLT">Bezahlt</option>
                      <option value="UEBERFAELLIG">Überfällig</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Rechnungsdatum</label>
                    <input name="issueDate" type="date" style={styles.input} />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Fällig am</label>
                    <input name="dueDate" type="date" style={styles.input} />
                  </div>

                  <div style={styles.fieldFull}>
                    <label style={styles.label}>PDF-Datei</label>
                    <input
                      type="file"
                      name="pdf"
                      accept="application/pdf"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.saveBtn}>
                    {navigation.state === "submitting"
                      ? "Speichert..."
                      : "Rechnung speichern"}
                  </button>

                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => setShowUpload(false)}
                  >
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
            <div style={styles.statValue}>{stats.totalCount}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Bezahlt</div>
            <div style={styles.statValue}>{stats.paidCount}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Offen</div>
            <div style={styles.statValue}>{stats.openCount}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Offener Betrag</div>
            <div style={styles.statValue}>{euro(stats.openAmount)}</div>
          </div>
        </div>
      </div>

      <section style={styles.card}>
        <div style={styles.eyebrow}>Alle Rechnungen</div>
        <h2 style={styles.h2}>Rechnungsliste</h2>

        {invoices.length === 0 ? (
          <div style={styles.empty}>
            Noch keine Rechnungen vorhanden. Sobald du eine PDF hochlädst,
            erscheint sie hier automatisch.
          </div>
        ) : (
          <div style={styles.list}>
            {invoices.map((inv) => (
              <div key={inv.id} style={styles.invoiceItem}>
                <div>
                  <div style={styles.invoiceNumber}>{inv.invoiceNumber}</div>
                  <div style={styles.meta}>
                    Firma: {inv.user?.companyName || "-"}
                    <br />
                    E-Mail: {inv.user?.email || "-"}
                    <br />
                    Rechnungsdatum: {formatDate(inv.issueDate || inv.createdAt)}
                    <br />
                    Fällig am: {formatDate(inv.dueDate)}
                    <br />
                    Status:{" "}
                    <span style={styles.badge}>{statusLabel(inv.status)}</span>
                  </div>
                </div>

                <div style={styles.amount}>
                  {inv.amountGross ? euro(inv.amountGross) : "—"}
                </div>

                <a
                  href={inv.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.pdfBtn}
                >
                  PDF öffnen
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}