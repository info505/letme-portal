import { Outlet, redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/");

  return { user };
}

export default function AdminLayout() {
  const { user } = useLoaderData();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      
      {/* SIDEBAR */}
      <aside style={{
        background: "#fff",
        borderRight: "1px solid #e7dfd1",
        padding: "30px 22px"
      }}>
        <div style={{ fontWeight: 800, marginBottom: 20 }}>
          LET ME BOWL
        </div>

        <div style={{ marginBottom: 30 }}>
          <strong>{user.firstName} {user.lastName}</strong>
          <div>Admin</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a href="/admin">Dashboard</a>
          <a href="/admin/customers">Firmenkunden</a>
          <a href="/admin/invoices">Rechnungen</a>
        </nav>
      </aside>

      {/* CONTENT */}
      <main style={{ padding: "30px" }}>
        <Outlet />
      </main>
    </div>
  );
}