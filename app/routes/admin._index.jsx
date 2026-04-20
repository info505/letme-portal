import { redirect, Link, useLoaderData } from "react-router";
import AdminLayout from "../components/AdminLayout.jsx";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  // Später echte Admin-Prüfung
  // Beispiel:
  // if (user.role !== "admin") throw redirect("/");

  return { user };
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "20px",
    padding: "22px",
  },
  label: {
    fontSize: "13px",
    color: "#8b806f",
    marginBottom: "8px",
  },
  value: {
    fontSize: "34px",
    fontWeight: 700,
    color: "#171717",
    margin: 0,
  },
  quickWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },
  quickCard: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "20px",
    padding: "22px",
  },
  quickTitle: {
    margin: "0 0 6px",
    fontSize: "18px",
    color: "#171717",
  },
  quickText: {
    margin: "0 0 14px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#776d61",
  },
  button: {
    display: "inline-block",
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
  },
};

export default function AdminDashboard() {
  const { user } = useLoaderData();

  return (
    <AdminLayout
      user={user}
      title="Admin Dashboard"
      subtitle="Interne Übersicht für Kundenkonto, Rechnungen und Firmenkunden."
    >
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.label}>Firmenkunden</div>
          <p style={styles.value}>0</p>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Rechnungen</div>
          <p style={styles.value}>0</p>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Portal-Zugänge</div>
          <p style={styles.value}>0</p>
        </div>
      </div>

      <div style={styles.quickWrap}>
        <div style={styles.quickCard}>
          <h2 style={styles.quickTitle}>Firmenkunden verwalten</h2>
          <p style={styles.quickText}>
            Firmen anlegen, bearbeiten und später mit Rechnungen verknüpfen.
          </p>
          <Link to="/admin/customers" style={styles.button}>
            Zu Firmenkunden
          </Link>
        </div>

        <div style={styles.quickCard}>
          <h2 style={styles.quickTitle}>Rechnungen hochladen</h2>
          <p style={styles.quickText}>
            PDFs einer Firma zuordnen, damit sie direkt im Kundenkonto sichtbar
            werden.
          </p>
          <Link to="/admin/invoices" style={styles.button}>
            Zu Rechnungen
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}