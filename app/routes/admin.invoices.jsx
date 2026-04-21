import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  return {
    email: user.email || null,
    isAdmin: user.isAdmin || false,
  };
}

export default function AdminInvoicesDebugPage() {
  const data = useLoaderData();

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
        <h1>Admin Invoices Debug</h1>
        <p>
          <strong>Email:</strong> {String(data.email)}
        </p>
        <p>
          <strong>isAdmin:</strong> {String(data.isAdmin)}
        </p>
        <p>Wenn du diese Seite siehst, funktioniert der Loader.</p>
      </div>
    </div>
  );
}