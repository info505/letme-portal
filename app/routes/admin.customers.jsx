import { redirect, useLoaderData, Form } from "react-router";
import { useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import AdminLayout from "../components/AdminLayout.jsx";
import { getPortalMailConfiguration as getMailjetConfig, sendPortalMailMessages as sendMailjetMessages } from "../lib/mail.server.js";

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendApprovalEmail(customer) {
  if (!customer?.email) return;

  const config = getMailjetConfig();

  const customerName =
    `${safeText(customer.firstName)} ${safeText(customer.lastName)}`.trim() ||
    customer.email;

  const message = {
    From: {
      Email: config.fromEmail,
      Name: config.fromName,
    },
    To: [
      {
        Email: customer.email,
        Name: customerName,
      },
    ],
    Subject: "Ihr Let Me Bowl Firmenkonto wurde freigeschaltet",
    TextPart: `
Ihr Let Me Bowl Firmenkonto wurde freigeschaltet

Guten Tag ${safeText(customer.firstName)},

vielen Dank für Ihre Registrierung. Ihr Let Me Bowl Firmenkonto wurde geprüft und ist nun freigeschaltet.

Sie können sich ab sofort im Portal anmelden:
https://konto.letmebowl-catering.de/login

Hinweis: Rechnungskauf ist nicht automatisch verfügbar. Diese Zahlungsart wird separat nach Prüfung freigegeben.

Mit freundlichen Grüßen
Let Me Bowl Catering
    `.trim(),
    HTMLPart: `
      <div style="font-family: Arial, sans-serif; color:#171717; line-height:1.6;">
        <h2>Ihr Firmenkonto wurde freigeschaltet</h2>

        <p>Guten Tag ${escapeHtml(customer.firstName || "")},</p>

        <p>
          vielen Dank für Ihre Registrierung. Ihr Let Me Bowl Firmenkonto wurde geprüft
          und ist nun freigeschaltet.
        </p>

        <p>
          Sie können sich ab sofort im Portal anmelden und Ihre Firmendaten,
          Rechnungen und Bestellungen verwalten.
        </p>

        <p style="padding:14px 16px;background:#fff8e8;border:1px solid #efdcae;border-radius:14px;">
          Hinweis: Rechnungskauf ist nicht automatisch verfügbar. Diese Zahlungsart wird
          separat nach Prüfung freigegeben.
        </p>

        <p>
          <a href="https://konto.letmebowl-catering.de/login"
             style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
            Zum Portal
          </a>
        </p>

        <p>Mit freundlichen Grüßen<br/>Let Me Bowl Catering</p>
      </div>
    `,
  };

  if (config.bccEmail) {
    message.Bcc = [
      {
        Email: config.bccEmail,
        Name: "Let Me Bowl BCC",
      },
    ];
  }

  const result = await sendMailjetMessages([message]);

  if (!result.sent) {
    throw new Error("Freigabe-E-Mail konnte nicht gesendet werden.");
  }

  return result;
}

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) throw redirect("/login");
  if (!user.isAdmin) throw redirect("/dashboard");

  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const error = url.searchParams.get("error");

  const customers = await prisma.portalUser.findMany({
    orderBy: [
      { isActive: "asc" },
      { createdAt: "desc" },
      { companyName: "asc" },
    ],
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
      invoicePurchaseEnabled: true,
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
  const intent = String(formData.get("intent") || "");

  try {
    if (intent === "create") {
      const companyName = String(formData.get("companyName") || "").trim();
      const firstName = String(formData.get("firstName") || "").trim();
      const lastName = String(formData.get("lastName") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const phone = String(formData.get("phone") || "").trim();
      const username = String(formData.get("username") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");

      if (!companyName || !firstName || !email || !username || !password) {
        return redirect("/admin/customers?error=missing_fields");
      }

      if (password.length < 8) {
        return redirect("/admin/customers?error=password_short");
      }

      const existing = await prisma.portalUser.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existing) {
        return redirect("/admin/customers?error=exists");
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await prisma.portalUser.create({
        data: {
          companyName,
          firstName,
          lastName,
          email,
          phone: phone || null,
          username,
          passwordHash,
          isActive: true,
          isAdmin: false,
          role: "ORDERER",
          mustResetPassword: false,
          invoicePurchaseEnabled: false,
          billing: {
            create: {
              companyName,
              contactName: `${firstName} ${lastName}`.trim(),
              email,
              phone,
            },
          },
        },
      });

      return redirect("/admin/customers?success=created");
    }

    if (intent === "approveCustomer") {
      const customerId = String(formData.get("customerId") || "");

      if (!customerId) {
        return redirect("/admin/customers?error=missing_customer");
      }

      const customer = await prisma.portalUser.update({
        where: { id: customerId },
        data: {
          isActive: true,
          isAdmin: false,
          role: "ORDERER",
        },
      });

      try {
        await sendApprovalEmail(customer);
      } catch (mailError) {
        console.error("APPROVAL_MAIL_ERROR:", mailError);
        return redirect("/admin/customers?success=approved_mail_failed");
      }

      return redirect("/admin/customers?success=approved");
    }

    if (intent === "toggleActive") {
      const customerId = String(formData.get("customerId") || "");
      const currentValue = String(formData.get("currentValue") || "false");

      if (!customerId) {
        return redirect("/admin/customers?error=missing_customer");
      }

      if (customerId === user.id) {
        return redirect("/admin/customers?error=self_block");
      }

      await prisma.portalUser.update({
        where: { id: customerId },
        data: {
          isActive: currentValue !== "true",
        },
      });

      return redirect("/admin/customers?success=status");
    }

    if (intent === "deleteCustomer") {
      const customerId = String(formData.get("customerId") || "");

      if (!customerId) {
        return redirect("/admin/customers?error=missing_customer");
      }

      if (customerId === user.id) {
        return redirect("/admin/customers?error=self_delete");
      }

      const customer = await prisma.portalUser.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return redirect("/admin/customers?error=missing_customer");
      }

      if (customer.isAdmin) {
        return redirect("/admin/customers?error=admin_delete");
      }

      await prisma.portalUser.delete({
        where: { id: customerId },
      });

      return redirect("/admin/customers?success=deleted");
    }

    return redirect("/admin/customers?error=unknown");
  } catch (error) {
    console.error("ADMIN_CUSTOMERS_ACTION_ERROR:", error);
    return redirect("/admin/customers?error=server");
  }
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("de-DE");
}

function getSuccessMessage(success) {
  if (success === "created") {
    return "Firma wurde erfolgreich angelegt. Rechnungskauf ist standardmäßig nicht freigegeben.";
  }

  if (success === "approved") {
    return "Kundenkonto wurde freigegeben und der Kunde wurde per E-Mail informiert.";
  }

  if (success === "approved_mail_failed") {
    return "Kundenkonto wurde freigegeben. Die E-Mail konnte jedoch nicht versendet werden.";
  }

  if (success === "status") {
    return "Status wurde erfolgreich geändert.";
  }

  if (success === "deleted") {
    return "Kundenkonto wurde gelöscht.";
  }

  return null;
}

function getErrorMessage(error) {
  if (error === "missing_fields") return "Bitte alle Pflichtfelder ausfüllen.";
  if (error === "password_short") return "Das Passwort muss mindestens 8 Zeichen lang sein.";
  if (error === "exists") return "Diese E-Mail oder dieser Benutzername existiert bereits.";
  if (error === "missing_customer") return "Kundenkonto wurde nicht gefunden.";
  if (error === "self_block") return "Du kannst dein eigenes Admin-Konto nicht deaktivieren.";
  if (error === "self_delete") return "Du kannst dein eigenes Admin-Konto nicht löschen.";
  if (error === "admin_delete") return "Admin-Konten können hier nicht gelöscht werden.";
  if (error === "server") return "Aktion konnte nicht ausgeführt werden.";
  if (error === "unknown") return "Unbekannte Aktion.";
  return null;
}

function CustomerCard({ customer }) {
  const isPending = !customer.isActive && !customer.isAdmin;
  const invoiceAllowed = Boolean(customer.invoicePurchaseEnabled);

  return (
    <article className={`lmbCustomerCard ${isPending ? "isPending" : ""}`}>
      <div className="lmbCustomerMain">
        <div className="lmbCustomerInfo">
          <div className="lmbCustomerCompany">{customer.companyName}</div>

          <div className="lmbCustomerMeta">
            <div>
              <span>Kontakt</span>
              <strong>
                {customer.firstName} {customer.lastName || ""}
              </strong>
            </div>

            <div>
              <span>E-Mail</span>
              <strong>{customer.email}</strong>
            </div>

            <div>
              <span>Telefon</span>
              <strong>{customer.phone || "-"}</strong>
            </div>

            <div>
              <span>Benutzername</span>
              <strong>{customer.username}</strong>
            </div>

            <div>
              <span>Registriert</span>
              <strong>{formatDate(customer.createdAt)}</strong>
            </div>

            <div>
              <span>Rechnungskauf</span>
              <strong className={invoiceAllowed ? "lmbInvoiceTextOk" : "lmbInvoiceTextNo"}>
                {invoiceAllowed ? "Freigegeben" : "Nicht freigegeben"}
              </strong>
            </div>
          </div>
        </div>

        <div className="lmbCustomerSide">
          <div className="lmbRolePill">
            {customer.isAdmin ? "ADMIN" : customer.role}
          </div>

          <span
            className={`lmbStatusPill ${
              isPending ? "pending" : customer.isActive ? "active" : "inactive"
            }`}
          >
            {isPending
              ? "Wartet auf Freigabe"
              : customer.isActive
              ? "Aktiv"
              : "Gesperrt"}
          </span>

          <span className={`lmbStatusPill ${invoiceAllowed ? "active" : "invoiceLocked"}`}>
            {invoiceAllowed ? "Rechnung frei" : "Rechnung gesperrt"}
          </span>

          {customer.mustResetPassword ? (
            <span className="lmbStatusPill pending">Passwortwechsel offen</span>
          ) : null}

          <div className="lmbCreatedText">
            {isPending ? "Neue Registrierung" : "Kundenkonto"}
            <br />
            {formatDate(customer.createdAt)}
          </div>
        </div>
      </div>

      <div className="lmbCustomerActions">
        <button
          type="button"
          className="lmbBtn lmbBtnDark"
          onClick={() => {
            window.location.href = `/admin/customer-detail?id=${customer.id}`;
          }}
        >
          Details öffnen
        </button>

        {isPending ? (
          <Form method="post" className="lmbActionForm">
            <input type="hidden" name="intent" value="approveCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />
            <button type="submit" className="lmbBtn lmbBtnApprove">
              Konto freigeben
            </button>
          </Form>
        ) : null}

        {!customer.isAdmin ? (
          <Form method="post" className="lmbActionForm">
            <input type="hidden" name="intent" value="toggleActive" />
            <input type="hidden" name="customerId" value={customer.id} />
            <input
              type="hidden"
              name="currentValue"
              value={String(customer.isActive)}
            />
            <button type="submit" className="lmbBtn lmbBtnLight">
              {customer.isActive ? "Konto sperren" : "Konto aktivieren"}
            </button>
          </Form>
        ) : null}

        {!customer.isAdmin ? (
          <Form
            method="post"
            className="lmbActionForm"
            onSubmit={(e) => {
              if (
                !window.confirm(
                  "Dieses Kundenkonto wirklich löschen? Alle zugehörigen Daten werden ebenfalls gelöscht."
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="deleteCustomer" />
            <input type="hidden" name="customerId" value={customer.id} />
            <button type="submit" className="lmbBtn lmbBtnDanger">
              Löschen
            </button>
          </Form>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminCustomersPage() {
  const { user, customers, success, error } = useLoaderData();

  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const activeCount = customers.filter((c) => c.isActive).length;
  const pendingCount = customers.filter((c) => !c.isActive && !c.isAdmin).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;
  const invoiceEnabledCount = customers.filter((c) => c.invoicePurchaseEnabled).length;

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const isPending = !customer.isActive && !customer.isAdmin;

      const matchesQuery =
        !q ||
        customer.companyName?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.username?.toLowerCase().includes(q) ||
        customer.firstName?.toLowerCase().includes(q) ||
        customer.lastName?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && customer.isActive) ||
        (statusFilter === "PENDING" && isPending) ||
        (statusFilter === "INACTIVE" && !customer.isActive) ||
        (statusFilter === "ADMIN" && customer.isAdmin) ||
        (statusFilter === "INVOICE_ENABLED" && customer.invoicePurchaseEnabled) ||
        (statusFilter === "INVOICE_DISABLED" && !customer.invoicePurchaseEnabled);

      return matchesQuery && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  return (
    <AdminLayout
      title="Firmenkunden"
      subtitle="Firmenkonten prüfen, freigeben und Rechnungskauf separat steuern."
      user={user}
    >


      <div className="lmbAdminCustomers">
        {getSuccessMessage(success) ? (
          <div className="lmbAlert lmbAlertSuccess">
            {getSuccessMessage(success)}
          </div>
        ) : null}

        {getErrorMessage(error) ? (
          <div className="lmbAlert lmbAlertError">
            {getErrorMessage(error)}
          </div>
        ) : null}

        <div className="lmbTopGrid">
          <section className="lmbCard">
            <div className="lmbEyebrow">Kundenverwaltung</div>

            <h2 className="lmbH2">Neue Firma manuell anlegen</h2>

            <p className="lmbText">
              Hier kannst du Firmenkunden selbst anlegen. Registrierungen über die
              Website erscheinen automatisch als „Wartet auf Freigabe“.
            </p>

            <button
              type="button"
              className="lmbBtn lmbBtnDark lmbBtnWide"
              onClick={() => setShowCreate((prev) => !prev)}
            >
              {showCreate ? "Formular schließen" : "Neue Firma anlegen"}
            </button>

            <div className="lmbInfoBox">
              Hinweis: Rechnungskauf wird nicht automatisch aktiviert. Die Freigabe
              erfolgt separat im jeweiligen Kundendetail.
            </div>

            {showCreate ? (
              <div className="lmbCreateBox">
                <Form method="post">
                  <input type="hidden" name="intent" value="create" />

                  <div className="lmbFormGrid">
                    <div className="lmbField">
                      <label className="lmbLabel">Firma</label>
                      <input name="companyName" className="lmbInput" required />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">Vorname</label>
                      <input name="firstName" className="lmbInput" required />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">Nachname</label>
                      <input name="lastName" className="lmbInput" />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">E-Mail</label>
                      <input
                        name="email"
                        type="email"
                        className="lmbInput"
                        required
                      />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">Telefon</label>
                      <input name="phone" className="lmbInput" />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">Benutzername</label>
                      <input name="username" className="lmbInput" required />
                    </div>

                    <div className="lmbField">
                      <label className="lmbLabel">Start-Passwort</label>
                      <input
                        name="password"
                        type="text"
                        className="lmbInput"
                        required
                        minLength={8}
                        placeholder="Mindestens 8 Zeichen"
                      />
                    </div>
                  </div>

                  <div className="lmbCreateActions">
                    <button type="submit" className="lmbBtn lmbBtnDark lmbBtnWide">
                      Firma speichern
                    </button>

                    <button
                      type="button"
                      className="lmbBtn lmbBtnLight lmbBtnWide"
                      onClick={() => setShowCreate(false)}
                    >
                      Abbrechen
                    </button>
                  </div>
                </Form>
              </div>
            ) : null}
          </section>

          <aside className="lmbStats">
            <div className="lmbStat">
              <div className="lmbStatLabel">Gesamt</div>
              <div className="lmbStatValue">{customers.length}</div>
            </div>

            <div className="lmbStat">
              <div className="lmbStatLabel">Freigabe</div>
              <div className="lmbStatValue">{pendingCount}</div>
            </div>

            <div className="lmbStat">
              <div className="lmbStatLabel">Aktiv</div>
              <div className="lmbStatValue">{activeCount}</div>
            </div>

            <div className="lmbStat">
              <div className="lmbStatLabel">Gesperrt</div>
              <div className="lmbStatValue">{inactiveCount}</div>
            </div>

            <div className="lmbStat">
              <div className="lmbStatLabel">Rechnung frei</div>
              <div className="lmbStatValue">{invoiceEnabledCount}</div>
            </div>
          </aside>
        </div>

        <section className="lmbCard">
          <div className="lmbEyebrow">Firmenliste</div>

          <h2 className="lmbH2">Alle Firmenkunden</h2>

          <div className="lmbSearchBar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche nach Firma, E-Mail, Name oder Benutzername"
              className="lmbInput"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="lmbInput"
            >
              <option value="ALL">Alle</option>
              <option value="PENDING">Wartet auf Freigabe</option>
              <option value="ACTIVE">Aktiv</option>
              <option value="INACTIVE">Gesperrt</option>
              <option value="INVOICE_ENABLED">Rechnungskauf freigegeben</option>
              <option value="INVOICE_DISABLED">Rechnungskauf gesperrt</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="lmbCustomerList">
            {filteredCustomers.length === 0 ? (
              <div className="lmbEmptyState">
                Keine passenden Firmenkunden gefunden.
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}