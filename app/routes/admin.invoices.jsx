import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (!user.isAdmin) {
    throw redirect("/");
  }

  let invoices = [];

  try {
    invoices = await prisma.portalInvoice.findMany({
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
  } catch (e) {
    console.log("DB ERROR:", e);
  }

  return {
    user,
    invoices,
  };
}

export default function AdminInvoicesPage() {
  const { invoices } = useLoaderData();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f4ee",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e7dfd1",
          borderRadius: "20px",
          padding: "30px",
        }}
      >
        <h1>Rechnungen</h1>

        {invoices.length === 0 ? (
          <p>Keine Rechnungen vorhanden.</p>
        ) : (
          <ul>
            {invoices.map((inv) => (
              <li key={inv.id}>
                {inv.invoiceNumber} – {inv.user?.companyName || "-"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}