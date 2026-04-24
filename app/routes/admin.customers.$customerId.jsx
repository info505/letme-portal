import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

export async function loader({ request, params }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const customerId = params.customerId;

  const customer = await prisma.portalUser.findUnique({
    where: { id: customerId },
    include: {
      billing: true,
      addresses: true,
      contacts: true,
      costCenters: true,
      invoices: true,
      orders: true,
    },
  });

  if (!customer) {
    throw redirect("/admin/customers");
  }

  return { user, customer };
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

export default function CustomerDetailPage() {
  const { user, customer } = useLoaderData();

  return (
    <AdminLayout
      title={customer.companyName}
      subtitle="Kundendetails, Rechnungen und Stammdaten"
      user={user}
    >
      <div style={{ display: "grid", gap: "20px" }}>

        {/* BASIC INFO */}
        <div style={card}>
          <h2>Stammdaten</h2>
          <p><strong>Firma:</strong> {customer.companyName}</p>
          <p><strong>Name:</strong> {customer.firstName} {customer.lastName}</p>
          <p><strong>E-Mail:</strong> {customer.email}</p>
          <p><strong>Telefon:</strong> {customer.phone || "-"}</p>
        </div>

        {/* BILLING */}
        <div style={card}>
          <h2>Rechnungsadresse</h2>
          {customer.billing ? (
            <>
              <p>{customer.billing.companyName}</p>
              <p>{customer.billing.street} {customer.billing.houseNumber}</p>
              <p>{customer.billing.postalCode} {customer.billing.city}</p>
            </>
          ) : (
            <p>Keine Rechnungsadresse hinterlegt</p>
          )}
        </div>

        {/* INVOICES */}
        <div style={card}>
          <h2>Rechnungen</h2>

          {customer.invoices.length === 0 ? (
            <p>Keine Rechnungen</p>
          ) : (
            customer.invoices.map((inv) => (
              <div key={inv.id} style={item}>
                <div>
                  <strong>{inv.invoiceNumber}</strong><br />
                  Betrag: {inv.amountGross || "-"}<br />
                  Datum: {formatDate(inv.issueDate)}
                </div>

                <a href={inv.pdfUrl} target="_blank">PDF</a>
              </div>
            ))
          )}
        </div>

        {/* ADDRESSES */}
        <div style={card}>
          <h2>Lieferadressen</h2>

          {customer.addresses.length === 0 ? (
            <p>Keine Adressen</p>
          ) : (
            customer.addresses.map((a) => (
              <div key={a.id} style={item}>
                {a.street} {a.houseNumber}<br />
                {a.postalCode} {a.city}
              </div>
            ))
          )}
        </div>

        {/* CONTACTS */}
        <div style={card}>
          <h2>Ansprechpartner</h2>

          {customer.contacts.length === 0 ? (
            <p>Keine Ansprechpartner</p>
          ) : (
            customer.contacts.map((c) => (
              <div key={c.id} style={item}>
                {c.firstName} {c.lastName}<br />
                {c.email}
              </div>
            ))
          )}
        </div>

        {/* COST CENTERS */}
        <div style={card}>
          <h2>Kostenstellen</h2>

          {customer.costCenters.length === 0 ? (
            <p>Keine Kostenstellen</p>
          ) : (
            customer.costCenters.map((c) => (
              <div key={c.id} style={item}>
                {c.name} ({c.code || "-"})
              </div>
            ))
          )}
        </div>

        {/* ORDERS */}
        <div style={card}>
          <h2>Bestellungen</h2>

          {customer.orders.length === 0 ? (
            <p>Keine Bestellungen</p>
          ) : (
            customer.orders.map((o) => (
              <div key={o.id} style={item}>
                {o.orderNumber}<br />
                Status: {o.status}<br />
                Gesamt: {o.totalAmount}
              </div>
            ))
          )}
        </div>

      </div>
    </AdminLayout>
  );
}

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid #e7dfd1",
};

const item = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};