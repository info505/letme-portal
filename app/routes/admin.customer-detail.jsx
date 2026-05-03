import { redirect, useLoaderData, Form, useNavigation } from "react-router";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import AdminLayout from "../components/AdminLayout.jsx";

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
  if (success === "invoicePurchase") return "Rechnungskauf-Freigabe wurde aktualisiert.";
  if (success === "passwordReset") return "Temporäres Passwort wurde gesetzt. Der Kunde muss beim nächsten Login ein neues Passwort vergeben.";
  return null;
}

function errorText(error) {
  if (error === "passwordTooShort") return "Das temporäre Passwort muss mindestens 8 Zeichen lang sein.";
  if (error === "passwordMissing") return "Bitte ein temporäres Passwort eingeben.";
  if (error === "adminPasswordResetBlocked") return "Admin-Passwörter sollten hier nicht zurückgesetzt werden.";
  return null;
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);
  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const customerId = url.searchParams.get("id");
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

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
    error,
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

  const detailUrl = `/admin/customer-detail?id=${customerId}`;
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "resetCustomerPassword") {
    const temporaryPassword = val(formData, "temporaryPassword");

    if (!temporaryPassword) {
      return redirect(`${detailUrl}&error=passwordMissing`);
    }

    if (temporaryPassword.length < 8) {
      return redirect(`${detailUrl}&error=passwordTooShort`);
    }

    const customer = await prisma.portalUser.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!customer) {
      return redirect("/admin/customers");
    }

    if (customer.isAdmin) {
      return redirect(`${detailUrl}&error=adminPasswordResetBlocked`);
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await prisma.portalUser.update({
      where: { id: customerId },
      data: {
        passwordHash,
        mustResetPassword: true,
      },
    });

    return redirect(`${detailUrl}&success=passwordReset`);
  }

  if (intent === "toggleInvoicePurchase") {
    const currentValue = String(formData.get("currentValue") || "false");

    await prisma.portalUser.update({
      where: { id: customerId },
      data: {
        invoicePurchaseEnabled: currentValue !== "true",
      },
    });

    return redirect(`${detailUrl}&success=invoicePurchase`);
  }

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

    return redirect(`${detailUrl}&success=billing`);
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

    return redirect(`${detailUrl}&success=address`);
  }

  if (intent === "deleteAddress") {
    const id = val(formData, "id");
    if (id) await prisma.deliveryAddress.delete({ where: { id } });
    return redirect(`${detailUrl}&success=deleted`);
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

    return redirect(`${detailUrl}&success=contact`);
  }

  if (intent === "deleteContact") {
    const id = val(formData, "id");
    if (id) await prisma.portalContact.delete({ where: { id } });
    return redirect(`${detailUrl}&success=deleted`);
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

    return redirect(`${detailUrl}&success=costCenter`);
  }

  if (intent === "deleteCostCenter") {
    const id = val(formData, "id");
    if (id) await prisma.costCenter.delete({ where: { id } });
    return redirect(`${detailUrl}&success=deleted`);
  }

  return redirect(detailUrl);
}

export default function CustomerDetailPage() {
  const { user, customer, success, error } = useLoaderData();
  const navigation = useNavigation();
  const message = successText(success);
  const errorMessage = errorText(error);

  const openInvoices = customer.invoices.filter((i) => i.status !== "BEZAHLT");
  const openAmount = openInvoices.reduce(
    (sum, inv) => sum + Number(inv.amountGross || 0),
    0
  );

  return (
    <AdminLayout
      title={customer.companyName}
      subtitle="Kundendetails, Zugang, Zahlungsfreigaben, Rechnungen, Adressen, Ansprechpartner und Kostenstellen."
      user={user}
    >
      <style>{`
        .lmbCustomerDetail {
          display: grid;
          gap: 22px;
        }

        .lmbAlert {
          background: #edf7ee;
          color: #1f6b36;
          border: 1px solid #cfe8d4;
          padding: 14px 16px;
          border-radius: 16px;
          font-weight: 850;
          line-height: 1.5;
        }

        .lmbAlertError {
          background: #fff4f4;
          color: #8b2222;
          border-color: #efcaca;
        }

        .lmbTopActions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .lmbBack {
          width: fit-content;
          background: #111;
          color: #fff;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 950;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .lmbStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .lmbStat {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 14px 35px rgba(30,20,10,0.04);
          min-width: 0;
        }

        .lmbStatLabel {
          font-size: 11.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #756b5f;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .lmbStatValue {
          font-size: 28px;
          line-height: 1.08;
          font-weight: 950;
          letter-spacing: -0.035em;
          color: #171717;
          overflow-wrap: anywhere;
        }

        .lmbGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          align-items: start;
        }

        .lmbCard {
          background: #fff;
          border: 1px solid #e8decd;
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(30,20,10,0.05);
          min-width: 0;
        }

        .lmbCardGold {
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.16), transparent 34%),
            linear-gradient(180deg, #fffaf0 0%, #fbf3e3 100%);
          border-color: rgba(200,169,106,0.32);
        }

        .lmbCardAccess {
          background:
            radial-gradient(circle at top right, rgba(35,49,66,0.08), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f7f2e8 100%);
        }

        .lmbFull {
          grid-column: 1 / -1;
        }

        .lmbEyebrow {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #b08b4f;
          font-weight: 950;
          margin-bottom: 12px;
        }

        .lmbH2 {
          margin: 0 0 14px;
          font-size: 26px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: #171717;
        }

        .lmbMeta {
          font-size: 15px;
          color: #6b6258;
          line-height: 1.75;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .lmbMeta strong {
          color: #171717;
          font-weight: 900;
        }

        .lmbNotice {
          margin-top: 14px;
          padding: 14px 15px;
          border-radius: 16px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(200,169,106,0.22);
          color: #6b6258;
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 650;
        }

        .lmbNoticeDanger {
          border-color: rgba(139,34,34,0.18);
          background: rgba(255,244,244,0.75);
          color: #8b2222;
        }

        .lmbList {
          display: grid;
          gap: 12px;
        }

        .lmbItem {
          border: 1px solid #ece5d8;
          border-radius: 20px;
          padding: 18px;
          background: #fbf8f2;
          line-height: 1.6;
          color: #6b6258;
          font-size: 14px;
          font-weight: 600;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .lmbItem strong {
          color: #171717;
          font-weight: 950;
        }

        .lmbItemTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .lmbBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .lmbBadge.open {
          background: #fbf3e3;
          color: #7a5a18;
          border: 1px solid #efdcae;
        }

        .lmbBadge.paid {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.overdue {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbBadge.active {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbBadge.inactive {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbFormGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .lmbField {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .lmbFieldFull {
          grid-column: 1 / -1;
        }

        .lmbLabel {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b6258;
          font-weight: 950;
        }

        .lmbInput {
          width: 100%;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid #dfd3bf;
          background: #fff;
          color: #171717;
          font-size: 15px;
          box-sizing: border-box;
          outline: none;
        }

        .lmbInput:focus {
          border-color: #c8a96a;
          box-shadow: 0 0 0 4px rgba(200,169,106,0.12);
        }

        .lmbActions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .lmbBtn {
          border: 0;
          background: #111;
          color: #fff;
          padding: 12px 14px;
          border-radius: 14px;
          font-weight: 950;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
        }

        .lmbBtnGold {
          background: linear-gradient(135deg, #c8a96a, #b8934f);
          color: #fff;
          box-shadow: 0 12px 24px rgba(200,169,106,0.18);
        }

        .lmbDanger {
          border: 1px solid #efcaca;
          background: #fff4f4;
          color: #8b2222;
          padding: 10px 12px;
          border-radius: 12px;
          font-weight: 950;
          cursor: pointer;
          min-height: 40px;
        }

        .lmbPdf {
          display: inline-flex;
          margin-top: 10px;
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 10px 12px;
          border-radius: 12px;
          font-weight: 950;
        }

        .lmbEmpty {
          margin: 0;
          padding: 18px;
          border-radius: 18px;
          background: #fbf8f2;
          border: 1px dashed #dccfba;
          color: #756b5f;
          font-weight: 800;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .lmbStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lmbGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .lmbCustomerDetail {
            gap: 16px;
          }

          .lmbTopActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .lmbBack {
            width: 100%;
          }

          .lmbStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .lmbStat {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbStatLabel {
            font-size: 10.5px;
          }

          .lmbStatValue {
            font-size: 24px;
          }

          .lmbCard {
            padding: 18px;
            border-radius: 22px;
          }

          .lmbH2 {
            font-size: 23px;
          }

          .lmbFormGrid {
            grid-template-columns: 1fr;
          }

          .lmbFieldFull {
            grid-column: auto;
          }

          .lmbActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .lmbBtn,
          .lmbDanger,
          .lmbPdf {
            width: 100%;
          }

          .lmbItem {
            padding: 16px;
            border-radius: 18px;
          }

          .lmbItemTop {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .lmbBadge {
            justify-self: start;
          }
        }

        @media (max-width: 420px) {
          .lmbStats {
            grid-template-columns: 1fr;
          }

          .lmbInput {
            font-size: 16px;
          }
        }
      `}</style>

      <div className="lmbCustomerDetail">
        {message ? <div className="lmbAlert">{message}</div> : null}
        {errorMessage ? <div className="lmbAlert lmbAlertError">{errorMessage}</div> : null}

        <div className="lmbTopActions">
          <a href="/admin/customers" className="lmbBack">
            Zurück zur Firmenliste
          </a>
        </div>

        <div className="lmbStats">
          <Stat label="Rechnungen" value={customer.invoices.length} />
          <Stat label="Offen" value={openInvoices.length} />
          <Stat label="Offener Betrag" value={euro(openAmount)} />
          <Stat label="Bestellungen" value={customer.orders.length} />
        </div>

        <div className="lmbGrid">
          <section className="lmbCard">
            <div className="lmbEyebrow">Stammdaten</div>
            <h2 className="lmbH2">Kundenkonto</h2>

            <div className="lmbMeta">
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
              Konto-Status:{" "}
              <span className={`lmbBadge ${customer.isActive ? "active" : "inactive"}`}>
                {customer.isActive ? "Aktiv" : "Inaktiv"}
              </span>
              <br />
              Passwortstatus:{" "}
              <span className={`lmbBadge ${customer.mustResetPassword ? "open" : "active"}`}>
                {customer.mustResetPassword ? "Muss geändert werden" : "Normal"}
              </span>
              <br />
              Rechnungskauf:{" "}
              <span
                className={`lmbBadge ${
                  customer.invoicePurchaseEnabled ? "active" : "inactive"
                }`}
              >
                {customer.invoicePurchaseEnabled ? "Freigegeben" : "Nicht freigegeben"}
              </span>
              <br />
              Angelegt: {formatDate(customer.createdAt)}
              <br />
              Aktualisiert: {formatDate(customer.updatedAt)}
            </div>
          </section>

          <section className="lmbCard lmbCardAccess">
            <div className="lmbEyebrow">Zugang & Passwort</div>
            <h2 className="lmbH2">Passwort zurücksetzen</h2>

            <div className="lmbMeta">
              Login: <strong>{customer.email}</strong>
              <br />
              Benutzername: <strong>{customer.username}</strong>
              <br />
              Passwortstatus:{" "}
              <span className={`lmbBadge ${customer.mustResetPassword ? "open" : "active"}`}>
                {customer.mustResetPassword ? "Kunde muss neues Passwort setzen" : "Kein Pflichtwechsel aktiv"}
              </span>
            </div>

            <div className="lmbNotice lmbNoticeDanger">
              Setze hier ein temporäres Passwort, falls der Firmenkunde keinen Zugriff mehr hat.
              Danach muss der Kunde beim nächsten Login ein neues eigenes Passwort vergeben.
            </div>

            {!customer.isAdmin ? (
              <Form method="post" className="lmbActions">
                <input type="hidden" name="intent" value="resetCustomerPassword" />

                <div className="lmbField" style={{ flex: "1 1 260px" }}>
                  <label className="lmbLabel">Temporäres Passwort</label>
                  <input
                    name="temporaryPassword"
                    type="text"
                    minLength={8}
                    required
                    placeholder="Mindestens 8 Zeichen"
                    className="lmbInput"
                  />
                </div>

                <button
                  type="submit"
                  className="lmbBtn"
                  onClick={(e) => {
                    if (
                      !window.confirm(
                        "Temporäres Passwort wirklich setzen? Der Kunde muss beim nächsten Login ein neues Passwort vergeben."
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  Passwort setzen
                </button>
              </Form>
            ) : (
              <div className="lmbNotice">
                Dieses Konto ist ein Admin-Konto. Admin-Passwörter sollten nicht über die Kundenverwaltung zurückgesetzt werden.
              </div>
            )}
          </section>

          <section className="lmbCard lmbCardGold">
            <div className="lmbEyebrow">Zahlungsfreigabe</div>
            <h2 className="lmbH2">Rechnungskauf</h2>

            <div className="lmbMeta">
              Status:{" "}
              <span
                className={`lmbBadge ${
                  customer.invoicePurchaseEnabled ? "active" : "inactive"
                }`}
              >
                {customer.invoicePurchaseEnabled ? "Freigegeben" : "Nicht freigegeben"}
              </span>
              <br />
              Konto:{" "}
              <span className={`lmbBadge ${customer.isActive ? "active" : "inactive"}`}>
                {customer.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </div>

            <div className="lmbNotice">
              Rechnungskauf sollte nur für geprüfte Firmenkunden freigegeben werden.
              Ein aktives Kundenkonto bedeutet nicht automatisch, dass Rechnungskauf erlaubt ist.
            </div>

            <Form method="post" className="lmbActions">
              <input type="hidden" name="intent" value="toggleInvoicePurchase" />
              <input
                type="hidden"
                name="currentValue"
                value={String(customer.invoicePurchaseEnabled)}
              />

              <button
                type="submit"
                className={`lmbBtn ${
                  customer.invoicePurchaseEnabled ? "" : "lmbBtnGold"
                }`}
              >
                {customer.invoicePurchaseEnabled
                  ? "Rechnungskauf sperren"
                  : "Rechnungskauf freigeben"}
              </button>
            </Form>
          </section>

          <section className="lmbCard">
            <div className="lmbEyebrow">Rechnungen</div>
            <h2 className="lmbH2">Rechnungen dieses Kunden</h2>

            {customer.invoices.length === 0 ? (
              <p className="lmbEmpty">Keine Rechnungen vorhanden.</p>
            ) : (
              <div className="lmbList">
                {customer.invoices.map((inv) => (
                  <div key={inv.id} className="lmbItem">
                    <div className="lmbItemTop">
                      <div>
                        <strong>{inv.invoiceNumber}</strong>
                        <br />
                        Betrag: {inv.amountGross ? euro(inv.amountGross) : "—"}
                        <br />
                        Datum: {formatDate(inv.issueDate)}
                        <br />
                        Fällig: {formatDate(inv.dueDate)}
                      </div>

                      <span className={`lmbBadge ${invoiceClass(inv.status)}`}>
                        {invoiceLabel(inv.status)}
                      </span>
                    </div>

                    {inv.pdfUrl ? (
                      <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="lmbPdf">
                        PDF öffnen
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lmbCard lmbFull">
            <div className="lmbEyebrow">Rechnungsadresse</div>
            <h2 className="lmbH2">Rechnungsadresse bearbeiten</h2>

            <Form method="post">
              <input type="hidden" name="intent" value="saveBilling" />

              <div className="lmbFormGrid">
                <Field label="Firma" name="companyName" defaultValue={customer.billing?.companyName || customer.companyName || ""} />
                <Field label="Kontakt" name="contactName" defaultValue={customer.billing?.contactName || `${customer.firstName} ${customer.lastName || ""}`.trim()} />
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

              <div className="lmbActions">
                <button type="submit" className="lmbBtn">
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
                {a.contactName ? (
                  <>
                    Kontakt: {a.contactName}
                    <br />
                  </>
                ) : null}
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
                <strong>
                  {c.firstName} {c.lastName}
                </strong>
                <br />
                {c.email}
                <br />
                {c.phone || "-"}
                <br />
                {c.roleLabel || ""}
                {c.department ? ` · ${c.department}` : ""}
              </>
            )}
          />

          <section className="lmbCard lmbFull">
            <div className="lmbEyebrow">Kostenstellen</div>
            <h2 className="lmbH2">Kostenstelle anlegen</h2>

            <Form method="post">
              <input type="hidden" name="intent" value="addCostCenter" />

              <div className="lmbFormGrid">
                <Field label="Name" name="name" required />
                <Field label="Code" name="code" />
                <Field label="Beschreibung" name="description" full />
              </div>

              <div className="lmbActions">
                <button type="submit" className="lmbBtn">
                  Kostenstelle speichern
                </button>
              </div>
            </Form>

            <div className="lmbList" style={{ marginTop: "18px" }}>
              {customer.costCenters.length === 0 ? (
                <p className="lmbEmpty">Keine Kostenstellen vorhanden.</p>
              ) : (
                customer.costCenters.map((c) => (
                  <div key={c.id} className="lmbItem">
                    <strong>{c.name}</strong> {c.code ? `(${c.code})` : ""}
                    <br />
                    {c.description || ""}
                    <DeleteForm intent="deleteCostCenter" id={c.id} />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="lmbCard lmbFull">
            <div className="lmbEyebrow">Bestellungen</div>
            <h2 className="lmbH2">Letzte Bestellungen</h2>

            {customer.orders.length === 0 ? (
              <p className="lmbEmpty">Keine Bestellungen vorhanden.</p>
            ) : (
              <div className="lmbList">
                {customer.orders.map((order) => (
                  <div key={order.id} className="lmbItem">
                    <div className="lmbItemTop">
                      <div>
                        <strong>
                          {order.orderNumber || order.shopifyOrderName || "Bestellung"}
                        </strong>
                        <br />
                        Bestellt am: {formatDate(order.orderedAt || order.createdAt)}
                        <br />
                        Lieferung: {formatDate(order.deliveryDate)}
                        <br />
                        Betrag: {order.totalAmount ? euro(order.totalAmount) : "—"}
                      </div>

                      {order.status ? (
                        <span className="lmbBadge open">{order.status}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function invoiceLabel(status) {
  if (status === "BEZAHLT") return "Bezahlt";
  if (status === "UEBERFAELLIG") return "Überfällig";
  return "Offen";
}

function invoiceClass(status) {
  if (status === "BEZAHLT") return "paid";
  if (status === "UEBERFAELLIG") return "overdue";
  return "open";
}

function Stat({ label, value }) {
  return (
    <div className="lmbStat">
      <div className="lmbStatLabel">{label}</div>
      <div className="lmbStatValue">{value}</div>
    </div>
  );
}

function Field({ label, name, defaultValue = "", required = false, full = false }) {
  return (
    <div className={`lmbField ${full ? "lmbFieldFull" : ""}`}>
      <label className="lmbLabel">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue || ""}
        required={required}
        className="lmbInput"
      />
    </div>
  );
}

function DeleteForm({ intent, id }) {
  return (
    <Form method="post" className="lmbActions">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="lmbDanger"
        onClick={(e) => {
          if (!window.confirm("Diesen Eintrag wirklich löschen?")) {
            e.preventDefault();
          }
        }}
      >
        Löschen
      </button>
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
    <section className="lmbCard">
      <div className="lmbEyebrow">{eyebrow}</div>
      <h2 className="lmbH2">{title}</h2>

      <Form method="post">
        <input type="hidden" name="intent" value={formIntent} />

        <div className="lmbFormGrid">
          {fields.map(([label, name, required]) => (
            <Field key={name} label={label} name={name} required={Boolean(required)} />
          ))}
        </div>

        <div className="lmbActions">
          <button type="submit" className="lmbBtn">
            {button}
          </button>
        </div>
      </Form>

      <div className="lmbList" style={{ marginTop: "18px" }}>
        {items.length === 0 ? (
          <p className="lmbEmpty">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="lmbItem">
              {renderItem(item)}
              <DeleteForm intent={deleteIntent} id={item.id} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}