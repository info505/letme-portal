import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);
  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const customerId = url.searchParams.get("id");
  const success = url.searchParams.get("success");

  if (!customerId) throw redirect("/admin/customers");

  const customer = await prisma.portalUser.findUnique({
    where: { id: customerId },
    include: {
      billing: true,
      addresses: { orderBy: { createdAt: "desc" } },
      contacts: { orderBy: { createdAt: "desc" } },
      costCenters: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) throw redirect("/admin/customers");

  return {
    user,
    success,
    customerId,
    customer: {
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      invoices: customer.invoices.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        issueDate: i.issueDate ? i.issueDate.toISOString() : null,
        dueDate: i.dueDate ? i.dueDate.toISOString() : null,
        amountGross: i.amountGross ? i.amountGross.toString() : null,
      })),
      orders: customer.orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        orderedAt: o.orderedAt ? o.orderedAt.toISOString() : null,
        deliveryDate: o.deliveryDate ? o.deliveryDate.toISOString() : null,
        totalAmount: o.totalAmount ? o.totalAmount.toString() : null,
      })),
    },
  };
}

export async function action({ request }) {
  const user = await getUserFromRequest(request);
  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const customerId = url.searchParams.get("id");

  if (!customerId) throw redirect("/admin/customers");

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "saveBilling") {
    const data = {
      companyName: val(formData, "companyName") || null,
      contactName: val(formData, "contactName") || null,
      email: val(formData, "email") || null,
      phone: val(formData, "phone") || null,
      street: val(formData, "street") || null,
      houseNumber: val(formData, "houseNumber") || null,
      postalCode: val(formData, "postalCode") || null,
      city: val(formData, "city") || null,
      country: val(formData, "country") || "Deutschland",
      vatId: val(formData, "vatId") || null,
      invoiceEmail: val(formData, "invoiceEmail") || null,
    };

    await prisma.billingProfile.upsert({
      where: { userId: customerId },
      update: data,
      create: { userId: customerId, ...data },
    });

    return redirect(`/admin/customers/detail?id=${customerId}&success=billing`);
  }

  if (intent === "addAddress") {
    await prisma.deliveryAddress.create({
      data: {
        userId: customerId,
        label: val(formData, "label") || null,
        contactName: val(formData, "contactName") || null,
        street: val(formData, "street"),
        houseNumber: val(formData, "houseNumber") || null,
        postalCode: val(formData, "postalCode"),
        city: val(formData, "city"),
        country: "Deutschland",
        notes: val(formData, "notes") || null,
      },
    });

    return redirect(`/admin/customers/detail?id=${customerId}&success=address`);
  }

  if (intent === "deleteAddress") {
    const id = val(formData, "id");
    if (id) await prisma.deliveryAddress.delete({ where: { id } });
    return redirect(`/admin/customers/detail?id=${customerId}&success=deleted`);
  }

  if (intent === "addContact") {
    await prisma.portalContact.create({
      data: {
        userId: customerId,
        firstName: val(formData, "firstName"),
        lastName: val(formData, "lastName") || null,
        email: val(formData, "email"),
        phone: val(formData, "phone") || null,
        roleLabel: val(formData, "roleLabel") || null,
        department: val(formData, "department") || null,
      },
    });

    return redirect(`/admin/customers/detail?id=${customerId}&success=contact`);
  }

  if (intent === "deleteContact") {
    const id = val(formData, "id");
    if (id) await prisma.portalContact.delete({ where: { id } });
    return redirect(`/admin/customers/detail?id=${customerId}&success=deleted`);
  }

  if (intent === "addCostCenter") {
    await prisma.costCenter.create({
      data: {
        userId: customerId,
        name: val(formData, "name"),
        code: val(formData, "code") || null,
        description: val(formData, "description") || null,
      },
    });

    return redirect(`/admin/customers/detail?id=${customerId}&success=costCenter`);
  }

  if (intent === "deleteCostCenter") {
    const id = val(formData, "id");
    if (id) await prisma.costCenter.delete({ where: { id } });
    return redirect(`/admin/customers/detail?id=${customerId}&success=deleted`);
  }

  return redirect(`/admin/customers/detail?id=${customerId}`);
}

function val(formData, key) {
  return String(formData.get(key) || "").trim();
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function euro(value) {
  const num = Number(value || 0);
  return num.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function successText(success) {
  if (success === "billing") return "Rechnungsadresse wurde gespeichert.";
  if (success === "address") return "Lieferadresse wurde angelegt.";
  if (success === "contact") return "Ansprechpartner wurde angelegt.";
  if (success === "costCenter") return "Kostenstelle wurde angelegt.";
  if (success === "deleted") return "Eintrag wurde gelöscht.";
  return null;
}

const styles = {
  alert: {
    background: "#edf7ee",
    color: "#1f6b36",
    border: "1px solid #cfe8d4",
    padding: "14px 16px",
    borderRadius: "16px",
    fontWeight: 800,
  },
  back: {
    width: "fit-content",
    background: "#111",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "14px",
    textDecoration: "none",
    fontWeight: 900,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },
  stat: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "22px",
    padding: "20px",
  },
  statLabel: {
    fontSize: "12px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#756b5f",
    fontWeight: 900,
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
    alignItems: "start",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8decd",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 18px 45px rgba(30,20,10,0.05)",
  },
  full: {
    gridColumn: "1 / -1",
  },
  eyebrow: {
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#b08b4f",
    fontWeight: 900,
    marginBottom: "12px",
  },
  h2: {
    margin: "0 0 14px",
    fontSize: "26px",
  },
  meta: {
    fontSize: "15px",
    color: "#6b6258",
    lineHeight: 1.75,
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  item: {
    border: "1px solid #ece5d8",
    borderRadius: "18px",
    padding: "18px",
    background: "#fbf8f2",
    lineHeight: 1.6,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  fieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6b6258",
    fontWeight: 900,
  },
  input: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "14px",
    border: "1px solid #dfd3bf",
    background: "#fff",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  btn: {
    border: 0,
    background: "#111",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: "14px",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
  },
  danger: {
    border: "1px solid #efcaca",
    background: "#fff4f4",
    color: "#8b2222",
    padding: "10px 12px",
    borderRadius: "12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  pdf: {
    display: "inline-block",
    marginTop: "10px",
    textDecoration: "none",
    background: "#111",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: "12px",
    fontWeight: 900,
  },
};

export default function CustomerDetailPage() {
  const { user, customer, success } = useLoaderData();
  const navigation = useNavigation();
  const message = successText(success);

  const openInvoices = customer.invoices.filter((i) => i.status !== "BEZAHLT");
  const openAmount = openInvoices.reduce(
    (sum, inv) => sum + Number(inv.amountGross || 0),
    0
  );

  return (
    <AdminLayout
      title={customer.companyName}
      subtitle="Kundendetails, Rechnungen, Adressen, Ansprechpartner und Kostenstellen."
      user={user}
    >
      {message ? <div style={styles.alert}>{message}</div> : null}

      <a href="/admin/customers" style={styles.back}>
        Zurück zur Firmenliste
      </a>

      <div style={styles.stats}>
        <Stat label="Rechnungen" value={customer.invoices.length} />
        <Stat label="Offen" value={openInvoices.length} />
        <Stat label="Offener Betrag" value={euro(openAmount)} />
        <Stat label="Bestellungen" value={customer.orders.length} />
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <div style={styles.eyebrow}>Stammdaten</div>
          <h2 style={styles.h2}>Kundenkonto</h2>
          <div style={styles.meta}>
            Firma: <strong>{customer.companyName}</strong>
            <br />
            Kontakt: {customer.firstName} {customer.lastName}
            <br />
            E-Mail: {customer.email}
            <br />
            Telefon: {customer.phone || "-"}
            <br />
            Benutzername: {customer.username}
            <br />
            Rolle: {customer.isAdmin ? "ADMIN" : customer.role}
            <br />
            Status: {customer.isActive ? "Aktiv" : "Inaktiv"}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Rechnungen</div>
          <h2 style={styles.h2}>Rechnungen dieses Kunden</h2>

          {customer.invoices.length === 0 ? (
            <p style={styles.meta}>Keine Rechnungen vorhanden.</p>
          ) : (
            <div style={styles.list}>
              {customer.invoices.map((inv) => (
                <div key={inv.id} style={styles.item}>
                  <strong>{inv.invoiceNumber}</strong>
                  <br />
                  Betrag: {inv.amountGross ? euro(inv.amountGross) : "—"}
                  <br />
                  Status: {inv.status}
                  <br />
                  Datum: {formatDate(inv.issueDate)}
                  <br />
                  Fällig: {formatDate(inv.dueDate)}
                  <br />
                  <a href={inv.pdfUrl} target="_blank" rel="noreferrer" style={styles.pdf}>
                    PDF öffnen
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...styles.card, ...styles.full }}>
          <div style={styles.eyebrow}>Rechnungsadresse</div>
          <h2 style={styles.h2}>Rechnungsadresse bearbeiten</h2>

          <Form method="post">
            <input type="hidden" name="intent" value="saveBilling" />

            <div style={styles.formGrid}>
              <Field label="Firma" name="companyName" defaultValue={customer.billing?.companyName || customer.companyName || ""} />
              <Field label="Kontakt" name="contactName" defaultValue={customer.billing?.contactName || `${customer.firstName} ${customer.lastName || ""}`} />
              <Field label="E-Mail" name="email" defaultValue={customer.billing?.email || customer.email || ""} />
              <Field label="Rechnungs-E-Mail" name="invoiceEmail" defaultValue={customer.billing?.invoiceEmail || customer.email || ""} />
              <Field label="Telefon" name="phone" defaultValue={customer.billing?.phone || customer.phone || ""} />
              <Field label="USt-IdNr." name="vatId" defaultValue={customer.billing?.vatId || ""} />
              <Field label="Straße" name="street" defaultValue={customer.billing?.street || ""} />
              <Field label="Hausnummer" name="houseNumber" defaultValue={customer.billing?.houseNumber || ""} />
              <Field label="PLZ" name="postalCode" defaultValue={customer.billing?.postalCode || ""} />
              <Field label="Stadt" name="city" defaultValue={customer.billing?.city || ""} />
              <Field label="Land" name="country" defaultValue={customer.billing?.country || "Deutschland"} />
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.btn}>
                {navigation.state === "submitting" ? "Speichert..." : "Rechnungsadresse speichern"}
              </button>
            </div>
          </Form>
        </section>

        <ListCreateSection
          title="Lieferadressen"
          eyebrow="Logistik"
          empty="Keine Lieferadressen vorhanden."
          formIntent="addAddress"
          button="Adresse speichern"
          items={customer.addresses}
          deleteIntent="deleteAddress"
          fields={[
            ["Label", "label"],
            ["Kontakt", "contactName"],
            ["Straße", "street", true],
            ["Hausnummer", "houseNumber"],
            ["PLZ", "postalCode", true],
            ["Stadt", "city", true],
            ["Notizen", "notes"],
          ]}
          renderItem={(a) => (
            <>
              <strong>{a.label || "Lieferadresse"}</strong>
              <br />
              {a.street} {a.houseNumber}
              <br />
              {a.postalCode} {a.city}
              <br />
              {a.notes || ""}
            </>
          )}
        />

        <ListCreateSection
          title="Ansprechpartner"
          eyebrow="Kontakte"
          empty="Keine Ansprechpartner vorhanden."
          formIntent="addContact"
          button="Ansprechpartner speichern"
          items={customer.contacts}
          deleteIntent="deleteContact"
          fields={[
            ["Vorname", "firstName", true],
            ["Nachname", "lastName"],
            ["E-Mail", "email", true],
            ["Telefon", "phone"],
            ["Rolle", "roleLabel"],
            ["Abteilung", "department"],
          ]}
          renderItem={(c) => (
            <>
              <strong>{c.firstName} {c.lastName}</strong>
              <br />
              {c.email}
              <br />
              {c.phone || "-"}
              <br />
              {c.roleLabel || ""}
            </>
          )}
        />

        <section style={{ ...styles.card, ...styles.full }}>
          <div style={styles.eyebrow}>Kostenstellen</div>
          <h2 style={styles.h2}>Kostenstelle anlegen</h2>

          <Form method="post">
            <input type="hidden" name="intent" value="addCostCenter" />
            <div style={styles.formGrid}>
              <Field label="Name" name="name" required />
              <Field label="Code" name="code" />
              <Field label="Beschreibung" name="description" full />
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.btn}>Kostenstelle speichern</button>
            </div>
          </Form>

          <div style={{ ...styles.list, marginTop: "18px" }}>
            {customer.costCenters.length === 0 ? (
              <p style={styles.meta}>Keine Kostenstellen vorhanden.</p>
            ) : (
              customer.costCenters.map((c) => (
                <div key={c.id} style={styles.item}>
                  <strong>{c.name}</strong> {c.code ? `(${c.code})` : ""}
                  <br />
                  {c.description || ""}
                  <DeleteForm intent="deleteCostCenter" id={c.id} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function Field({ label, name, defaultValue = "", required = false, full = false }) {
  return (
    <div style={full ? styles.fieldFull : styles.field}>
      <label style={styles.label}>{label}</label>
      <input name={name} defaultValue={defaultValue} required={required} style={styles.input} />
    </div>
  );
}

function DeleteForm({ intent, id }) {
  return (
    <Form method="post" style={{ marginTop: "10px" }}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" style={styles.danger}>Löschen</button>
    </Form>
  );
}

function ListCreateSection({
  title,
  eyebrow,
  empty,
  formIntent,
  button,
  items,
  renderItem,
  deleteIntent,
  fields,
}) {
  return (
    <section style={styles.card}>
      <div style={styles.eyebrow}>{eyebrow}</div>
      <h2 style={styles.h2}>{title}</h2>

      <Form method="post">
        <input type="hidden" name="intent" value={formIntent} />

        <div style={styles.formGrid}>
          {fields.map(([label, name, required]) => (
            <Field key={name} label={label} name={name} required={Boolean(required)} />
          ))}
        </div>

        <div style={styles.actions}>
          <button type="submit" style={styles.btn}>{button}</button>
        </div>
      </Form>

      <div style={{ ...styles.list, marginTop: "18px" }}>
        {items.length === 0 ? (
          <p style={styles.meta}>{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={styles.item}>
              {renderItem(item)}
              <DeleteForm intent={deleteIntent} id={item.id} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}