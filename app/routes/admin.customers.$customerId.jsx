import { redirect, useLoaderData, Form, useNavigation } from "react-router";
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

export async function action({ request, params }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const customerId = params.customerId;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "saveBilling") {
    const existing = await prisma.billingProfile.findUnique({
      where: { userId: customerId },
    });

    const data = {
      companyName: String(formData.get("companyName") || "").trim() || null,
      contactName: String(formData.get("contactName") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      street: String(formData.get("street") || "").trim() || null,
      houseNumber: String(formData.get("houseNumber") || "").trim() || null,
      postalCode: String(formData.get("postalCode") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      country: String(formData.get("country") || "").trim() || "Deutschland",
      vatId: String(formData.get("vatId") || "").trim() || null,
      invoiceEmail: String(formData.get("invoiceEmail") || "").trim() || null,
    };

    if (existing) {
      await prisma.billingProfile.update({
        where: { userId: customerId },
        data,
      });
    } else {
      await prisma.billingProfile.create({
        data: {
          userId: customerId,
          ...data,
        },
      });
    }

    return redirect(`/admin/customers/${customerId}?success=billing`);
  }

  if (intent === "addAddress") {
    await prisma.deliveryAddress.create({
      data: {
        userId: customerId,
        label: String(formData.get("label") || "").trim() || null,
        companyName: String(formData.get("companyName") || "").trim() || null,
        contactName: String(formData.get("contactName") || "").trim() || null,
        phone: String(formData.get("phone") || "").trim() || null,
        street: String(formData.get("street") || "").trim(),
        houseNumber: String(formData.get("houseNumber") || "").trim() || null,
        postalCode: String(formData.get("postalCode") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        country: String(formData.get("country") || "").trim() || "Deutschland",
        notes: String(formData.get("notes") || "").trim() || null,
      },
    });

    return redirect(`/admin/customers/${customerId}?success=address`);
  }

  if (intent === "deleteAddress") {
    const id = String(formData.get("id") || "");
    if (id) {
      await prisma.deliveryAddress.delete({ where: { id } });
    }
    return redirect(`/admin/customers/${customerId}?success=deleted`);
  }

  if (intent === "addContact") {
    await prisma.portalContact.create({
      data: {
        userId: customerId,
        firstName: String(formData.get("firstName") || "").trim(),
        lastName: String(formData.get("lastName") || "").trim() || null,
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || null,
        roleLabel: String(formData.get("roleLabel") || "").trim() || null,
        department: String(formData.get("department") || "").trim() || null,
      },
    });

    return redirect(`/admin/customers/${customerId}?success=contact`);
  }

  if (intent === "deleteContact") {
    const id = String(formData.get("id") || "");
    if (id) {
      await prisma.portalContact.delete({ where: { id } });
    }
    return redirect(`/admin/customers/${customerId}?success=deleted`);
  }

  if (intent === "addCostCenter") {
    await prisma.costCenter.create({
      data: {
        userId: customerId,
        name: String(formData.get("name") || "").trim(),
        code: String(formData.get("code") || "").trim() || null,
        description: String(formData.get("description") || "").trim() || null,
      },
    });

    return redirect(`/admin/customers/${customerId}?success=costCenter`);
  }

  if (intent === "deleteCostCenter") {
    const id = String(formData.get("id") || "");
    if (id) {
      await prisma.costCenter.delete({ where: { id } });
    }
    return redirect(`/admin/customers/${customerId}?success=deleted`);
  }

  return redirect(`/admin/customers/${customerId}`);
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
    letterSpacing: "-0.03em",
  },
  meta: {
    fontSize: "15px",
    color: "#6b6258",
    lineHeight: 1.7,
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
  const { user, customer } = useLoaderData();
  const navigation = useNavigation();

  const url =
    typeof window !== "undefined" ? new URL(window.location.href) : null;
  const success = url?.searchParams.get("success");
  const message = successText(success);

  return (
    <AdminLayout
      title={customer.companyName}
      subtitle="Kundendetails, Rechnungen, Adressen, Ansprechpartner und Kostenstellen."
      user={user}
    >
      {message ? <div style={styles.alert}>{message}</div> : null}

      <a href="/admin/customers" style={{ ...styles.btn, width: "fit-content" }}>
        Zurück zur Firmenliste
      </a>

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
              <div style={styles.field}>
                <label style={styles.label}>Firma</label>
                <input name="companyName" defaultValue={customer.billing?.companyName || customer.companyName || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Kontakt</label>
                <input name="contactName" defaultValue={customer.billing?.contactName || `${customer.firstName} ${customer.lastName || ""}`} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>E-Mail</label>
                <input name="email" defaultValue={customer.billing?.email || customer.email || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Rechnungs-E-Mail</label>
                <input name="invoiceEmail" defaultValue={customer.billing?.invoiceEmail || customer.email || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Telefon</label>
                <input name="phone" defaultValue={customer.billing?.phone || customer.phone || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>USt-IdNr.</label>
                <input name="vatId" defaultValue={customer.billing?.vatId || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Straße</label>
                <input name="street" defaultValue={customer.billing?.street || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Hausnummer</label>
                <input name="houseNumber" defaultValue={customer.billing?.houseNumber || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>PLZ</label>
                <input name="postalCode" defaultValue={customer.billing?.postalCode || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Stadt</label>
                <input name="city" defaultValue={customer.billing?.city || ""} style={styles.input} />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Land</label>
                <input name="country" defaultValue={customer.billing?.country || "Deutschland"} style={styles.input} />
              </div>
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.btn}>
                {navigation.state === "submitting" ? "Speichert..." : "Rechnungsadresse speichern"}
              </button>
            </div>
          </Form>
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Lieferadressen</div>
          <h2 style={styles.h2}>Neue Lieferadresse</h2>

          <Form method="post">
            <input type="hidden" name="intent" value="addAddress" />
            <div style={styles.formGrid}>
              <div style={styles.field}><label style={styles.label}>Label</label><input name="label" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Kontakt</label><input name="contactName" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Straße</label><input name="street" style={styles.input} required /></div>
              <div style={styles.field}><label style={styles.label}>Hausnummer</label><input name="houseNumber" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>PLZ</label><input name="postalCode" style={styles.input} required /></div>
              <div style={styles.field}><label style={styles.label}>Stadt</label><input name="city" style={styles.input} required /></div>
              <div style={styles.fieldFull}><label style={styles.label}>Notizen</label><input name="notes" style={styles.input} /></div>
            </div>
            <div style={styles.actions}><button type="submit" style={styles.btn}>Adresse speichern</button></div>
          </Form>

          <div style={{ ...styles.list, marginTop: "18px" }}>
            {customer.addresses.length === 0 ? (
              <p style={styles.meta}>Keine Lieferadressen vorhanden.</p>
            ) : (
              customer.addresses.map((a) => (
                <div key={a.id} style={styles.item}>
                  <strong>{a.label || "Lieferadresse"}</strong>
                  <br />
                  {a.street} {a.houseNumber}
                  <br />
                  {a.postalCode} {a.city}
                  <br />
                  {a.notes || ""}
                  <Form method="post" style={{ marginTop: "10px" }}>
                    <input type="hidden" name="intent" value="deleteAddress" />
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" style={styles.danger}>Löschen</button>
                  </Form>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.eyebrow}>Ansprechpartner</div>
          <h2 style={styles.h2}>Neuen Ansprechpartner anlegen</h2>

          <Form method="post">
            <input type="hidden" name="intent" value="addContact" />
            <div style={styles.formGrid}>
              <div style={styles.field}><label style={styles.label}>Vorname</label><input name="firstName" style={styles.input} required /></div>
              <div style={styles.field}><label style={styles.label}>Nachname</label><input name="lastName" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>E-Mail</label><input name="email" style={styles.input} required /></div>
              <div style={styles.field}><label style={styles.label}>Telefon</label><input name="phone" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Rolle</label><input name="roleLabel" style={styles.input} /></div>
              <div style={styles.field}><label style={styles.label}>Abteilung</label><input name="department" style={styles.input} /></div>
            </div>
            <div style={styles.actions}><button type="submit" style={styles.btn}>Ansprechpartner speichern</button></div>
          </Form>

          <div style={{ ...styles.list, marginTop: "18px" }}>
            {customer.contacts.length === 0 ? (
              <p style={styles.meta}>Keine Ansprechpartner vorhanden.</p>
            ) : (
              customer.contacts.map((c) => (
                <div key={c.id} style={styles.item}>
                  <strong>{c.firstName} {c.lastName}</strong>
                  <br />
                  {c.email}
                  <br />
                  {c.phone || "-"}
                  <br />
                  {c.roleLabel || ""}
                  <Form method="post" style={{ marginTop: "10px" }}>
                    <input type="hidden" name="intent" value="deleteContact" />
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={styles.danger}>Löschen</button>
                  </Form>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={{ ...styles.card, ...styles.full }}>
          <div style={styles.eyebrow}>Kostenstellen</div>
          <h2 style={styles.h2}>Kostenstelle anlegen</h2>

          <Form method="post">
            <input type="hidden" name="intent" value="addCostCenter" />
            <div style={styles.formGrid}>
              <div style={styles.field}><label style={styles.label}>Name</label><input name="name" style={styles.input} required /></div>
              <div style={styles.field}><label style={styles.label}>Code</label><input name="code" style={styles.input} /></div>
              <div style={styles.fieldFull}><label style={styles.label}>Beschreibung</label><input name="description" style={styles.input} /></div>
            </div>
            <div style={styles.actions}><button type="submit" style={styles.btn}>Kostenstelle speichern</button></div>
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
                  <Form method="post" style={{ marginTop: "10px" }}>
                    <input type="hidden" name="intent" value="deleteCostCenter" />
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={styles.danger}>Löschen</button>
                  </Form>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={{ ...styles.card, ...styles.full }}>
          <div style={styles.eyebrow}>Bestellungen</div>
          <h2 style={styles.h2}>Bestellhistorie</h2>

          {customer.orders.length === 0 ? (
            <p style={styles.meta}>Keine Bestellungen vorhanden.</p>
          ) : (
            <div style={styles.list}>
              {customer.orders.map((o) => (
                <div key={o.id} style={styles.item}>
                  <strong>{o.orderNumber}</strong>
                  <br />
                  Status: {o.status}
                  <br />
                  Gesamt: {euro(o.totalAmount)}
                  <br />
                  Bestellt am: {formatDate(o.orderedAt)}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}