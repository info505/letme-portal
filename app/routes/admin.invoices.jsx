import { redirect, useLoaderData } from "react-router";
import AdminLayout from "../components/AdminLayout.jsx";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  // Später Admin-Check
  return {
    user,
    invoices: [],
  };
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
  info: {
    fontSize: "14px",
    color: "#776d61",
    lineHeight: 1.6,
  },
};

export default function AdminInvoicesPage() {
  const { user, invoices } = useLoaderData();

  return (
    <AdminLayout
      user={user}
      title="Rechnungen"
      subtitle="Rechnungen hochladen und dem jeweiligen Firmenkunden zuordnen."
    >
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>Rechnungsliste</h2>
          <button style={styles.button}>Rechnung hochladen</button>
        </div>

        {invoices.length === 0 ? (
          <div style={styles.info}>
            Noch keine Rechnungen vorhanden. Hier werden später PDF-Rechnungen
            angezeigt, die du Firmen zuordnest.
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}