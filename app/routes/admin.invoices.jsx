import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import path from "path";
import fs from "fs/promises";
import AdminLayout from "../components/AdminLayout.jsx";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toISOString().slice(0, 10);
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (!user.isAdmin) {
    throw redirect("/");
  }

  const portalUsers = await prisma.portalUser.findMany({
    orderBy: {
      companyName: "asc",
    },
    select: {
      id: true,
      companyName: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  const invoices = await prisma.portalInvoice.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          companyName: true,
          email: true,
        },
      },
    },
  });

  return {
    user,
    portalUsers,
    invoices: invoices.map((invoice) => ({
      ...invoice,
      issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      createdAt: invoice.createdAt.toISOString(),
      amountGross: invoice.amountGross ? invoice.amountGross.toString() : null,
    })),
  };
}

export async function action({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (!user.isAdmin) {
    throw redirect("/");
  }

  const formData = await request.formData();

  const userId = formData.get("userId");
  const invoiceNumber = formData.get("invoiceNumber");
  const title = formData.get("title");
  const issueDate = formData.get("issueDate");
  const dueDate = formData.get("dueDate");
  const amountGross = formData.get("amountGross");
  const status = formData.get("status");
  const file = formData.get("pdf");

  if (!userId || !invoiceNumber || !file || !(file instanceof File)) {
    return Response.json(
      { error: "Bitte Kundenkonto, Rechnungsnummer und PDF angeben." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return Response.json(
      { error: "Bitte nur PDF-Dateien hochladen." },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "invoices");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeOriginalName}`;
  const filepath = path.join(uploadDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filepath, buffer);

  const pdfUrl = `/uploads/invoices/${filename}`;

  await prisma.portalInvoice.create({
    data: {
      userId: String(userId),
      invoiceNumber: String(invoiceNumber),
      title: title ? String(title) : null,
      issueDate: issueDate ? new Date(String(issueDate)) : null,
      dueDate: dueDate ? new Date(String(dueDate)) : null,
      amountGross: amountGross ? Number(String(amountGross).replace(",", ".")) : null,
      status: String(status || "OFFEN"),
      pdfUrl,
      originalName: file.name,
    },
  });

  return redirect("/admin/invoices");
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "20px",
    padding: "22px",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    gap: "16px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    color: "#171717",
  },
  button: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d9cfbf",
    background: "#fff",
    color: "#171717",
    padding: "12px 16px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  info: {
    fontSize: "14px",
    color: "#776d61",
    lineHeight: 1.6,
  },
  uploadBox: {
    marginBottom: "20px",
    border: "1px solid #e7dfd1",
    borderRadius: "16px",
    padding: "18px",
    background: "#fdfbf7",
  },
  uploadTitle: {
    margin: "0 0 14px",
    fontSize: "17px",
    fontWeight: 700,
    color: "#171717",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "12px",
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldWrapFull: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#5d5449",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #ddd2c1",
    background: "#fff",
    fontSize: "14px",
    color: "#171717",
    outline: "none",
    boxSizing: "border-box",
  },
  fileInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #ddd2c1",
    background: "#fff",
    fontSize: "14px",
    color: "#171717",
    boxSizing: "border-box",
  },
  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  tableWrap: {
    overflowX: "auto",
    marginTop: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: "13px",
    color: "#7c7368",
    padding: "12px 10px",
    borderBottom: "1px solid #ece3d6",
    whiteSpace: "nowrap",
  },
  td: {
    fontSize: "14px",
    color: "#1c1c1c",
    padding: "14px 10px",
    borderBottom: "1px solid #f1eadf",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: "#f3ede3",
    border: "1px solid #e1d5bf",
    color: "#3d362f",
  },
  link: {
    color: "#111",
    fontWeight: 600,
    textDecoration: "none",
  },
};

function InvoiceStatusBadge({ status }) {
  let label = "Offen";

  if (status === "BEZAHLT") label = "Bezahlt";
  if (status === "UEBERFAELLIG") label = "Überfällig";

  return <span style={styles.badge}>{label}</span>;
}

export default function AdminInvoicesPage() {
  const { user, portalUsers, invoices } = useLoaderData();
  const [showUpload, setShowUpload] = useState(false);
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  return (
    <AdminLayout
      user={user}
      title="Rechnungen"
      subtitle="Rechnungen hochladen und dem jeweiligen Kundenkonto zuordnen."
    >
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>Rechnungsliste</h2>

          <button
            type="button"
            style={styles.button}
            onClick={() => setShowUpload((prev) => !prev)}
          >
            {showUpload ? "Upload schließen" : "Rechnung hochladen"}
          </button>
        </div>

        {showUpload && (
          <div style={styles.uploadBox}>
            <h3 style={styles.uploadTitle}>Neue Rechnung hochladen</h3>

            <Form method="post" encType="multipart/form-data">
              <div style={styles.formGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Kundenkonto</label>
                  <select name="userId" style={styles.input} required defaultValue="">
                    <option value="" disabled>
                      Kundenkonto auswählen
                    </option>
                    {portalUsers.map((portalUser) => (
                      <option key={portalUser.id} value={portalUser.id}>
                        {portalUser.companyName} ({portalUser.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Rechnungsnummer</label>
                  <input
                    name="invoiceNumber"
                    type="text"
                    placeholder="z. B. LMB-2026-001"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Titel</label>
                  <input
                    name="title"
                    type="text"
                    placeholder="z. B. Catering März 2026"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Betrag brutto</label>
                  <input
                    name="amountGross"
                    type="number"
                    step="0.01"
                    placeholder="z. B. 357.00"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Rechnungsdatum</label>
                  <input name="issueDate" type="date" style={styles.input} />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Fällig am</label>
                  <input name="dueDate" type="date" style={styles.input} />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Status</label>
                  <select name="status" style={styles.input} defaultValue="OFFEN">
                    <option value="OFFEN">Offen</option>
                    <option value="BEZAHLT">Bezahlt</option>
                    <option value="UEBERFAELLIG">Überfällig</option>
                  </select>
                </div>

                <div style={styles.fieldWrapFull}>
                  <label style={styles.label}>PDF-Datei</label>
                  <input
                    name="pdf"
                    type="file"
                    accept="application/pdf"
                    style={styles.fileInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="submit" style={styles.button} disabled={isSubmitting}>
                  {isSubmitting ? "Speichert..." : "Rechnung speichern"}
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setShowUpload(false)}
                >
                  Abbrechen
                </button>
              </div>
            </Form>
          </div>
        )}

        {invoices.length === 0 ? (
          <div style={styles.info}>Noch keine Rechnungen vorhanden.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Rechnungsnr.</th>
                  <th style={styles.th}>Firma</th>
                  <th style={styles.th}>Titel</th>
                  <th style={styles.th}>Datum</th>
                  <th style={styles.th}>Fällig</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={styles.td}>{invoice.invoiceNumber}</td>
                    <td style={styles.td}>{invoice.user?.companyName || "-"}</td>
                    <td style={styles.td}>{invoice.title || "-"}</td>
                    <td style={styles.td}>{formatDate(invoice.issueDate)}</td>
                    <td style={styles.td}>{formatDate(invoice.dueDate)}</td>
                    <td style={styles.td}>
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td style={styles.td}>
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.link}
                      >
                        PDF öffnen
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}