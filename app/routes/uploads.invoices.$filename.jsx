import path from "path";
import fs from "fs/promises";

export async function loader({ params }) {
  const filename = params.filename;

  if (!filename) {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "uploads", "invoices", safeFilename);

  try {
    const file = await fs.readFile(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    throw new Response("Datei nicht gefunden", { status: 404 });
  }
}