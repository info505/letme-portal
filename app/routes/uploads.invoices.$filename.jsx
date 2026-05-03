import path from "path";
import fs from "fs/promises";
import { redirect } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";

async function tryRead(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function cleanFilename(filename) {
  const decoded = decodeURIComponent(String(filename || ""));
  return path.basename(decoded);
}

export async function loader({ request, params }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  const filename = cleanFilename(params.filename);

  if (!filename) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  const pdfUrl = `/uploads/invoices/${filename}`;

  const invoice = await prisma.portalInvoice.findFirst({
    where: {
      pdfUrl,
    },
    select: {
      id: true,
      userId: true,
      invoiceNumber: true,
      originalName: true,
      pdfUrl: true,
    },
  });

  if (!invoice) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  const isOwner = invoice.userId === user.id;
  const isAdmin = Boolean(user.isAdmin);

  if (!isOwner && !isAdmin) {
    throw new Response("Kein Zugriff auf diese Datei", { status: 403 });
  }

  const newPath = path.join(
    process.cwd(),
    "uploads",
    "invoices",
    filename
  );

  const oldPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "invoices",
    filename
  );

  let file = await tryRead(newPath);

  if (!file) {
    file = await tryRead(oldPath);
  }

  if (!file) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  const downloadName =
    invoice.originalName ||
    `Rechnung-${invoice.invoiceNumber || invoice.id}.pdf`;

  const safeDownloadName = downloadName.replace(/["\r\n]/g, "_");

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}