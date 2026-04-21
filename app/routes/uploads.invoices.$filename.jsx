import path from "path";
import fs from "fs/promises";

async function tryRead(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function loader({ params }) {
  const filename = params.filename;

  if (!filename) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  const safeFilename = path.basename(filename);

  const newPath = path.join(process.cwd(), "uploads", "invoices", safeFilename);
  const oldPath = path.join(process.cwd(), "public", "uploads", "invoices", safeFilename);

  let file = await tryRead(newPath);

  if (!file) {
    file = await tryRead(oldPath);
  }

  if (!file) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}