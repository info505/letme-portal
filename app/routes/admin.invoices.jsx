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

function toDateInput(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
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

function statusClass(status) {
  if (status === "BEZAHLT") return "paid";
  if (status === "UEBERFAELLIG") return "overdue";
  return "open";
}

function successText(success) {
  if (success === "uploaded") return "Rechnung wurde erfolgreich hochgeladen.";
  if (success === "updated") return "Rechnung wurde erfolgreich aktualisiert.";
  if (success === "deleted") return "Rechnung wurde gelöscht.";
  if (success === "replaced") return "PDF wurde erfolgreich ersetzt.";
  return null;
}

function errorText(error) {
  if (error === "not_pdf") return "Bitte nur PDF-Dateien hochladen.";
  if (error === "missing_fields") return "Bitte alle Pflichtfelder prüfen.";
  if (error === "missing_invoice") return "Rechnung wurde nicht gefunden.";
  if (error === "server") return "Aktion konnte nicht ausgeführt werden.";
  return "Aktion konnte nicht ausgeführt werden. Bitte Pflichtfelder prüfen.";
}

async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "uploads", "invoices");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function savePdf(file) {
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.type !== "application/pdf") {
    throw new Error("NOT_PDF");
  }

  const uploadDir = await ensureUploadDir();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  return {
    pdfUrl: `/uploads/invoices/${filename}`,
    originalName: file.name,
  };
}

async function deleteUploadedFile(pdfUrl) {
  if (!pdfUrl || !pdfUrl.startsWith("/uploads/invoices/")) return;

  const filename = pdfUrl.replace("/uploads/invoices/", "");
  const filepath = path.join(process.cwd(), "uploads", "invoices", filename);

  try {
    await fs.unlink(filepath);
  } catch {
    // Railway kann Dateien nach Redeploy verlieren. Dann ignorieren.
  }
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

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
    success,
    error,
    invoices: invoices.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      issueDate: inv.issueDate ? inv.issueDate.toISOString() : null,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      amountGross: inv.amountGross ? inv.amountGross.toString() : "",
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
  const intent = String(formData.get("intent") || "create");

  try {
    if (intent === "delete") {
      const invoiceId = String(formData.get("invoiceId") || "");

      if (!invoiceId) return redirect("/admin/invoices?error=missing_invoice");

      const invoice = await prisma.portalInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (invoice) {
        await deleteUploadedFile(invoice.pdfUrl);
        await prisma.portalInvoice.delete({ where: { id: invoiceId } });
      }

      return redirect("/admin/invoices?success=deleted");
    }

    if (intent === "update") {
      const invoiceId = String(formData.get("invoiceId") || "");
      const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
      const amountGross = String(formData.get("amountGross") || "").trim();
      const issueDate = String(formData.get("issueDate") || "").trim();
      const dueDate = String(formData.get("dueDate") || "").trim();
      const status = String(formData.get("status") || "OFFEN");
      const file = formData.get("pdf");

      if (!invoiceId || !invoiceNumber) {
        return redirect("/admin/invoices?error=missing_fields");
      }

      const oldInvoice = await prisma.portalInvoice.findUnique({
        where: { id: invoiceId },
      });

      if (!oldInvoice) {
        return redirect("/admin/invoices?error=missing_invoice");
      }

      const updateData = {
        invoiceNumber,
        amountGross: amountGross ? Number(amountGross.replace(",", ".")) : null,
        issueDate: issueDate ? new Date(issueDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
      };

      let replacedPdf = false;

      if (file instanceof File && file.size > 0) {
        const saved = await savePdf(file);

        if (saved) {
          await deleteUploadedFile(oldInvoice.pdfUrl);
          updateData.pdfUrl = saved.pdfUrl;
          updateData.originalName = saved.originalName;
          replacedPdf = true;
        }
      }

      await prisma.portalInvoice.update({
        where: { id: invoiceId },
        data: updateData,
      });

      return redirect(
        `/admin/invoices?success=${replacedPdf ? "replaced" : "updated"}`
      );
    }

    const userId = formData.get("userId");
    const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
    const amountGross = String(formData.get("amountGross") || "").trim();
    const issueDate = String(formData.get("issueDate") || "").trim();
    const dueDate = String(formData.get("dueDate") || "").trim();
    const status = String(formData.get("status") || "OFFEN");
    const file = formData.get("pdf");

    if (!userId || !invoiceNumber || !(file instanceof File) || file.size === 0) {
      return redirect("/admin/invoices?error=missing_fields");
    }

    const saved = await savePdf(file);

    await prisma.portalInvoice.create({
      data: {
        userId: String(userId),
        invoiceNumber,
        pdfUrl: saved.pdfUrl,
        amountGross: amountGross ? Number(amountGross.replace(",", ".")) : null,
        issueDate: issueDate ? new Date(issueDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        originalName: saved.originalName,
      },
    });

    return redirect("/admin/invoices?success=uploaded");
  } catch (error) {
    console.error("ADMIN_INVOICE_ACTION_ERROR:", error);

    if (error.message === "NOT_PDF") {
      return redirect("/admin/invoices?error=not_pdf");
    }

    return redirect("/admin/invoices?error=server");
  }
}

function EditInvoiceForm({ inv, navigation, onClose }) {
  return (
    <div className="lmbInvoiceEditBox">
      <Form method="post" encType="multipart/form-data">
        <input type="hidden" name="intent" value="update" />
        <input type="hidden" name="invoiceId" value={inv.id} />

        <div className="lmbFormGrid">
          <Field
            label="Rechnungsnummer"
            name="invoiceNumber"
            defaultValue={inv.invoiceNumber}
            required
          />

          <Field
            label="Betrag brutto"
            name="amountGross"
            type="number"
            step="0.01"
            defaultValue={inv.amountGross || ""}
          />

          <div className="lmbField">
            <label className="lmbLabel">Status</label>
            <select name="status" defaultValue={inv.status} className="lmbInput">
              <option value="OFFEN">Offen</option>
              <option value="BEZAHLT">Bezahlt</option>
              <option value="UEBERFAELLIG">Überfällig</option>
            </select>
          </div>

          <Field
            label="Rechnungsdatum"
            name="issueDate"
            type="date"
            defaultValue={toDateInput(inv.issueDate)}
          />

          <Field
            label="Fällig am"
            name="dueDate"
            type="date"
            defaultValue={toDateInput(inv.dueDate)}
          />

          <div className="lmbField lmbFieldFull">
            <label className="lmbLabel">PDF ersetzen</label>
            <input
              type="file"
              name="pdf"
              accept="application/pdf"
              className="lmbInput"
            />
            <div className="lmbSmallText">
              Aktuelle Datei: {inv.originalName || "PDF vorhanden"}
            </div>
          </div>
        </div>

        <div className="lmbFormActions">
          <button type="submit" className="lmbBtn lmbBtnDark">
            {navigation.state === "submitting"
              ? "Speichert..."
              : "Änderungen speichern"}
          </button>

          <button type="button" className="lmbBtn lmbBtnLight" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </Form>
    </div>
  );
}

function InvoiceRow({ inv, navigation }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <article className="lmbInvoiceItem">
      <div className="lmbInvoiceTop">
        <div className="lmbInvoiceMain">
          <div className="lmbInvoiceNumber">{inv.invoiceNumber}</div>

          <div className="lmbInvoiceMeta">
            <div>
              <span>Firma</span>
              <strong>{inv.user?.companyName || "-"}</strong>
            </div>

            <div>
              <span>E-Mail</span>
              <strong>{inv.user?.email || "-"}</strong>
            </div>

            <div>
              <span>Rechnungsdatum</span>
              <strong>{formatDate(inv.issueDate || inv.createdAt)}</strong>
            </div>

            <div>
              <span>Fällig am</span>
              <strong>{formatDate(inv.dueDate)}</strong>
            </div>

            <div>
              <span>Datei</span>
              <strong>{inv.originalName || "-"}</strong>
            </div>
          </div>
        </div>

        <div className="lmbInvoiceSide">
          <div className="lmbInvoiceAmount">
            {inv.amountGross ? euro(inv.amountGross) : "—"}
          </div>

          <span className={`lmbBadge ${statusClass(inv.status)}`}>
            {statusLabel(inv.status)}
          </span>

          {inv.pdfUrl ? (
            <a
              href={inv.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="lmbPdfBtn"
            >
              PDF öffnen
            </a>
          ) : null}
        </div>
      </div>

      <div className="lmbRowActions">
        <button
          type="button"
          className="lmbBtn lmbBtnLight"
          onClick={() => setShowEdit((prev) => !prev)}
        >
          {showEdit ? "Bearbeiten schließen" : "Bearbeiten"}
        </button>

        <Form
          method="post"
          className="lmbActionForm"
          onSubmit={(e) => {
            if (!window.confirm("Diese Rechnung wirklich löschen?")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="invoiceId" value={inv.id} />
          <button type="submit" className="lmbBtn lmbBtnDanger">
            Löschen
          </button>
        </Form>
      </div>

      {showEdit ? (
        <EditInvoiceForm
          inv={inv}
          navigation={navigation}
          onClose={() => setShowEdit(false)}
        />
      ) : null}
    </article>
  );
}

export default function AdminInvoicesPage() {
  const { user, portalUsers, invoices, stats, success, error } = useLoaderData();
  const [showUpload, setShowUpload] = useState(false);
  const navigation = useNavigation();

  return (
    <AdminLayout
      title="Rechnungen"
      subtitle="PDF-Rechnungen hochladen, Firmen zuordnen und Zahlungsstatus verwalten."
      user={user}
    >
      <style>{`
        .lmbInvoicesPage {
          display: grid;
          gap: 22px;
        }

        .lmbAlert {
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 850;
          line-height: 1.5;
        }

        .lmbAlertSuccess {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
        }

        .lmbAlertError {
          background: #fff4f4;
          color: #8b2222;
          border: 1px solid #efcaca;
        }

        .lmbTopGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
          gap: 22px;
          align-items: start;
        }

        .lmbCard {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
          min-width: 0;
        }

        .lmbEyebrow {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #b08b4f;
          font-weight: 950;
          margin-bottom: 14px;
        }

        .lmbH2 {
          margin: 0 0 12px;
          font-size: 28px;
          line-height: 1.08;
          letter-spacing: -0.035em;
          color: #171717;
        }

        .lmbText {
          margin: 0 0 22px;
          font-size: 15px;
          line-height: 1.7;
          color: #756b5f;
          font-weight: 600;
        }

        .lmbStats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .lmbStat {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 12px 30px rgba(30,20,10,0.035);
          min-width: 0;
        }

        .lmbStatLabel {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #756b5f;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .lmbStatValue {
          font-size: 32px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #171717;
          overflow-wrap: anywhere;
        }

        .lmbUploadBox,
        .lmbInvoiceEditBox {
          margin-top: 22px;
          border: 1px solid #eadfcd;
          border-radius: 24px;
          padding: 22px;
          background: #fbf8f2;
        }

        .lmbFormGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .lmbField {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .lmbFieldFull {
          grid-column: 1 / -1;
        }

        .lmbLabel {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b6258;
          font-weight: 950;
        }

        .lmbInput {
          width: 100%;
          padding: 14px 15px;
          border-radius: 15px;
          border: 1px solid #dfd3bf;
          background: #fff;
          color: #171717;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
        }

        .lmbInput:focus {
          border-color: #c8a96a;
          box-shadow: 0 0 0 4px rgba(200,169,106,0.12);
        }

        .lmbSmallText {
          font-size: 13px;
          color: #756b5f;
          line-height: 1.5;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .lmbFormActions,
        .lmbRowActions {
          display: flex;
          gap: 12px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .lmbBtn {
          min-height: 44px;
          border-radius: 14px;
          padding: 0 15px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          white-space: nowrap;
        }

        .lmbBtnDark {
          border: 0;
          background: #111;
          color: #fff;
        }

        .lmbBtnLight {
          border: 1px solid #dfd3bf;
          background: #fff;
          color: #171717;
        }

        .lmbBtnDanger {
          border: 1px solid #efcaca;
          background: #fff4f4;
          color: #8b2222;
        }

        .lmbBtnWide {
          min-height: 48px;
          padding: 0 18px;
          border-radius: 16px;
        }

        .lmbList {
          display: grid;
          gap: 14px;
        }

        .lmbInvoiceItem {
          border: 1px solid #ece5d8;
          border-radius: 22px;
          padding: 20px;
          background: #fbf8f2;
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .lmbInvoiceTop {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 18px;
          align-items: start;
        }

        .lmbInvoiceMain {
          min-width: 0;
        }

        .lmbInvoiceNumber {
          font-size: 21px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.025em;
          color: #171717;
          margin-bottom: 12px;
          overflow-wrap: anywhere;
        }

        .lmbInvoiceMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 18px;
          font-size: 13.5px;
          color: #6b6258;
          line-height: 1.45;
        }

        .lmbInvoiceMeta span {
          display: block;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 950;
          color: #9a8d7d;
          margin-bottom: 3px;
        }

        .lmbInvoiceMeta strong {
          display: block;
          color: #332f2a;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .lmbInvoiceSide {
          display: grid;
          justify-items: end;
          gap: 10px;
        }

        .lmbInvoiceAmount {
          font-size: 24px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.035em;
          color: #171717;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .lmbPdfBtn {
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .lmbBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          text-align: center;
          white-space: nowrap;
        }

        .lmbBadge.open {
          background: #fbf3e3;
          color: #7a5a18;
          border: 1px solid #efdcae;
        }

        .lmbBadge.paid {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.overdue {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbActionForm {
          display: inline-flex;
          margin: 0;
        }

        .lmbEmpty {
          border: 1px dashed #dfd3bf;
          border-radius: 20px;
          padding: 24px;
          color: #756b5f;
          background: #fffdfa;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 1050px) {
          .lmbTopGrid {
            grid-template-columns: 1fr;
          }

          .lmbStats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .lmbInvoiceTop {
            grid-template-columns: 1fr;
          }

          .lmbInvoiceSide {
            justify-items: start;
          }

          .lmbInvoiceAmount {
            text-align: left;
          }
        }

        @media (max-width: 760px) {
          .lmbInvoicesPage {
            gap: 16px;
          }

          .lmbCard {
            padding: 18px;
            border-radius: 22px;
          }

          .lmbH2 {
            font-size: 23px;
          }

          .lmbText {
            font-size: 14px;
          }

          .lmbStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .lmbStat {
            padding: 16px;
            border-radius: 18px;
          }

          .lmbStatValue {
            font-size: 27px;
          }

          .lmbFormGrid {
            grid-template-columns: 1fr;
          }

          .lmbFieldFull {
            grid-column: auto;
          }

          .lmbUploadBox,
          .lmbInvoiceEditBox {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbInvoiceItem {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbInvoiceMeta {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .lmbFormActions,
          .lmbRowActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .lmbActionForm {
            display: block;
            width: 100%;
          }

          .lmbBtn,
          .lmbPdfBtn,
          .lmbActionForm .lmbBtn {
            width: 100%;
            min-height: 48px;
          }
        }

        @media (max-width: 420px) {
          .lmbStats {
            grid-template-columns: 1fr;
          }

          .lmbInput {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="lmbInvoicesPage">
        {successText(success) ? (
          <div className="lmbAlert lmbAlertSuccess">{successText(success)}</div>
        ) : null}

        {error ? (
          <div className="lmbAlert lmbAlertError">{errorText(error)}</div>
        ) : null}

        <div className="lmbTopGrid">
          <section className="lmbCard">
            <div className="lmbEyebrow">Rechnungsverwaltung</div>
            <h2 className="lmbH2">Neue Rechnung hochladen</h2>
            <p className="lmbText">
              Lade eine PDF hoch und ordne sie direkt einem Firmenkunden zu. Der Kunde sieht danach nur seine eigenen Rechnungen im Kundenportal.
            </p>

            <button
              type="button"
              className="lmbBtn lmbBtnDark lmbBtnWide"
              onClick={() => setShowUpload((prev) => !prev)}
            >
              {showUpload ? "Upload schließen" : "Rechnung hochladen"}
            </button>

            {showUpload && (
              <div className="lmbUploadBox">
                <Form method="post" encType="multipart/form-data">
                  <input type="hidden" name="intent" value="create" />

                  <div className="lmbFormGrid">
                    <div className="lmbField">
                      <label className="lmbLabel">Kundenkonto</label>
                      <select name="userId" className="lmbInput" required defaultValue="">
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

                    <Field
                      label="Rechnungsnummer"
                      name="invoiceNumber"
                      placeholder="z. B. 105858"
                      required
                    />

                    <Field
                      label="Betrag brutto"
                      name="amountGross"
                      type="number"
                      step="0.01"
                      placeholder="z. B. 149.90"
                    />

                    <div className="lmbField">
                      <label className="lmbLabel">Status</label>
                      <select name="status" className="lmbInput" defaultValue="OFFEN">
                        <option value="OFFEN">Offen</option>
                        <option value="BEZAHLT">Bezahlt</option>
                        <option value="UEBERFAELLIG">Überfällig</option>
                      </select>
                    </div>

                    <Field label="Rechnungsdatum" name="issueDate" type="date" />
                    <Field label="Fällig am" name="dueDate" type="date" />

                    <div className="lmbField lmbFieldFull">
                      <label className="lmbLabel">PDF-Datei</label>
                      <input
                        type="file"
                        name="pdf"
                        accept="application/pdf"
                        className="lmbInput"
                        required
                      />
                    </div>
                  </div>

                  <div className="lmbFormActions">
                    <button type="submit" className="lmbBtn lmbBtnDark">
                      {navigation.state === "submitting"
                        ? "Speichert..."
                        : "Rechnung speichern"}
                    </button>

                    <button
                      type="button"
                      className="lmbBtn lmbBtnLight"
                      onClick={() => setShowUpload(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </Form>
              </div>
            )}
          </section>

          <aside className="lmbStats">
            <Stat label="Gesamt" value={stats.totalCount} />
            <Stat label="Bezahlt" value={stats.paidCount} />
            <Stat label="Offen" value={stats.openCount} />
            <Stat label="Offener Betrag" value={euro(stats.openAmount)} />
          </aside>
        </div>

        <section className="lmbCard">
          <div className="lmbEyebrow">Alle Rechnungen</div>
          <h2 className="lmbH2">Rechnungsliste</h2>

          {invoices.length === 0 ? (
            <div className="lmbEmpty">
              Noch keine Rechnungen vorhanden. Sobald du eine PDF hochlädst, erscheint sie hier automatisch.
            </div>
          ) : (
            <div className="lmbList">
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} inv={inv} navigation={navigation} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue = "",
  placeholder = "",
  required = false,
}) {
  return (
    <div className="lmbField">
      <label className="lmbLabel">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="lmbInput"
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="lmbStat">
      <div className="lmbStatLabel">{label}</div>
      <div className="lmbStatValue">{value}</div>
    </div>
  );
}