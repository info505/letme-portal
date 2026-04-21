import { redirect, useLoaderData } from "react-router";
import AdminLayout from "../components/AdminLayout.jsx";
import { getUserFromRequest } from "../lib/auth.server.js";

const ADMIN_EMAIL = "info@letmebowl-catering.de";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (!user.email || user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw redirect("/");
  }

  return {
    user,
    customers: [],
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
  empty: {
    padding: "24px 0 8px",
    color: "#776d61",
    fontSize: "14px",
  },
};

export default function AdminCustomersPage() {
  const { user, customers } = useLoaderData();

  return (
    <AdminLayout
      user={user}
      title="Firmenkunden"
      subtitle="Hier verwaltest du alle Firmenkunden für das LMB-Kundenkonto."
    >
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>Firmenliste</h2>
          <button type="button" style={styles.button}>
            Neue Firma anlegen
          </button>
        </div>

        {customers.length === 0 ? (
          <div style={styles.empty}>Noch keine Firmenkunden vorhanden.</div>
        ) : null}
      </div>
    </AdminLayout>
  );
}