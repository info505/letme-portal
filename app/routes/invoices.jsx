import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";
import PortalLayout from "../components/PortalLayout.jsx";

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toISOString().slice(0, 10);
}

function prettyStatus(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  const invoices = await prisma.portalInvoice.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    user,
    invoices: invoices.map((invoice) => ({
      ...invoice,
      issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      createdAt: invoice.createdAt.toISOString(),
      amountGross: invoice.amountGross ? invoice.amountGross.toString() : null,
    })),
  };
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "20px",
    padding: "22px",
  },
  title: {
    margin: "0 0 6px",
    fontSize: "24px",
    color: "#171717",
  },
  text: {
    margin: "0 0 20px",
    fontSize: "14px",
    color: "#776d61",
  },
  list: {
    display: "grid",
    gap: "14px",
  },
  item: {
    border: "1px solid #ece3d6",
    borderRadius: "16px",
    padding: "18px",
    background: "#fcfaf6",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
  },
  strong: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#171717",
  },
  meta: {
    fontSize: "14px",
    color: "#6f665b",
    marginTop: "6px",
    lineHeight: 1.6,
  },
  link: {
    display: "inline-block",
    marginTop: "12px",
    textDecoration: "none",
    color: "#111",
    fontWeight: 700,
  },
};

export default function InvoicesPage() {
  const { user, invoices } = useLoaderData();

  return (
    <PortalLayout user={user}>
      <div style={styles.card}>
        <h1 style={styles.title}>Rechnungen</h1>
        <p style={styles.text}>
          Hier findest du alle Rechnungen, die deinem Kundenkonto zugeordnet sind.
        </p>

        {invoices.length === 0 ? (
          <div style={styles.text}>Aktuell sind keine Rechnungen vorhanden.</div>
        ) : (
          <div style={styles.list}>
            {invoices.map((invoice) => (
              <div key={invoice.id} style={styles.item}>
                <div style={styles.row}>
                  <div>
                    <div style={styles.strong}>
                      {invoice.title || invoice.invoiceNumber}
                    </div>
                    <div style={styles.meta}>
                      Rechnungsnummer: {invoice.invoiceNumber}
                      <br />
                      Status: {prettyStatus(invoice.status)}
                      <br />
                      Rechnungsdatum: {formatDate(invoice.issueDate)}
                      <br />
                      Fällig am: {formatDate(invoice.dueDate)}
                      <br />
                      Betrag: {invoice.amountGross ? `${invoice.amountGross} €` : "-"}
                    </div>
                  </div>
                </div>

                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  PDF öffnen
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}