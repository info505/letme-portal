import { redirect, useLoaderData, Form } from "react-router";
import { useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  const customers = await prisma.portalUser.findMany({
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      username: true,
      isActive: true,
      role: true,
      mustResetPassword: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return {
    user,
    success,
    error,
    customers: customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function action({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "create") {
      const companyName = String(formData.get("companyName") || "").trim();
      const firstName = String(formData.get("firstName") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const username = String(formData.get("username") || "").trim();
      const password = String(formData.get("password") || "");

      if (!companyName || !firstName || !email || !username || !password) {
        return redirect("/admin/customers?error=missing_fields");
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.portalUser.create({
        data: {
          companyName,
          firstName,
          email,
          username,
          passwordHash,
          isActive: true,
          isAdmin: false,
        },
      });

      return redirect("/admin/customers?success=created");
    }

    if (intent === "deleteCustomer") {
      const customerId = String(formData.get("customerId") || "");

      if (!customerId) {
        return redirect("/admin/customers?error=missing_customer");
      }

      await prisma.portalUser.delete({
        where: { id: customerId },
      });

      return redirect("/admin/customers?success=deleted");
    }

    return redirect("/admin/customers?error=unknown");
  } catch (error) {
    console.error(error);
    return redirect("/admin/customers?error=server");
  }
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "20px",
    padding: "20px",
  },
  button: {
    background: "#111",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
  },
};

function CustomerCard({ customer }) {
  return (
    <div style={styles.card}>
      <h3>{customer.companyName}</h3>

      <p>
        {customer.firstName} {customer.lastName}
        <br />
        {customer.email}
      </p>

      {/* ✅ FIXED DETAILS BUTTON */}
      <button
        type="button"
        style={styles.button}
        onClick={() => {
          window.location.href = `/admin/customer-detail?id=${customer.id}`;
        }}
      >
        Details öffnen
      </button>

      <Form method="post">
        <input type="hidden" name="intent" value="deleteCustomer" />
        <input type="hidden" name="customerId" value={customer.id} />
        <button style={{ marginTop: "10px" }}>Löschen</button>
      </Form>
    </div>
  );
}

export default function AdminCustomersPage() {
  const { user, customers } = useLoaderData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <AdminLayout title="Firmenkunden" user={user}>
      <input
        placeholder="Suche..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: "20px", padding: "10px", width: "100%" }}
      />

      <div style={{ display: "grid", gap: "15px" }}>
        {filtered.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </AdminLayout>
  );
}