import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { useState } from "react";
import path from "path";
import fs from "fs/promises";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toISOString().slice(0, 10);
}

// ======================
// LOADER
// ======================
export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");

  // 🔥 WICHTIG: ADMIN CHECK
  if (!user.isAdmin) {
    throw redirect("/");
  }

  const portalUsers = await prisma.portalUser.findMany({
    orderBy: { companyName: "asc" },
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

  return { user, portalUsers, invoices };
}

// ======================
// ACTION (UPLOAD)
// ======================
export async function action({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/");

  const formData = await request.formData();

  const userId = formData.get("userId");
  const invoiceNumber = formData.get("invoiceNumber");
  const file = formData.get("pdf");

  if (!userId || !invoiceNumber || !(file instanceof File)) {
    return Response.json({ error: "Fehlende Daten" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public/uploads/invoices");
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${file.name}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const pdfUrl = `/uploads/invoices/${filename}`;

  await prisma.portalInvoice.create({
    data: {
      userId: String(userId),
      invoiceNumber: String(invoiceNumber),
      pdfUrl,
    },
  });

  return redirect("/admin/invoices");
}

// ======================
// COMPONENT
// ======================
export default function AdminInvoicesPage() {
  const { portalUsers, invoices } = useLoaderData();
  const [showUpload, setShowUpload] = useState(false);
  const navigation = useNavigation();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Rechnungen</h1>

      <button onClick={() => setShowUpload(!showUpload)}>
        {showUpload ? "Schließen" : "Rechnung hochladen"}
      </button>

      {showUpload && (
        <Form method="post" encType="multipart/form-data">
          <br />

          <select name="userId" required>
            <option value="">Kunde wählen</option>
            {portalUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.companyName} ({u.email})
              </option>
            ))}
          </select>

          <br /><br />

          <input
            name="invoiceNumber"
            placeholder="Rechnungsnummer"
            required
          />

          <br /><br />

          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            required
          />

          <br /><br />

          <button type="submit">
            {navigation.state === "submitting"
              ? "Speichert..."
              : "Speichern"}
          </button>
        </Form>
      )}

      <hr />

      <h2>Liste</h2>

      {invoices.length === 0 ? (
        <p>Keine Rechnungen vorhanden</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nr</th>
              <th>Firma</th>
              <th>Datum</th>
              <th>PDF</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber}</td>
                <td>{inv.user?.companyName}</td>
                <td>{formatDate(inv.createdAt)}</td>
                <td>
                  <a href={inv.pdfUrl} target="_blank">
                    Öffnen
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}