import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
import { card, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  // Noch Platzhalterdaten, aber jetzt strukturiert und systemisch eingebunden
  // Später hier durch echte DB-Rechnungen ersetzen
  const invoices = [
    {
      id: "inv_1",
      number: "RE-2026-001",
      date: "2026-04-12",
      status: "paid",
      amountCents: 18950,
      currency: "EUR",
      note:
        locale === "de"
          ? "Zahlung eingegangen"
          : "Payment received",
    },
    {
      id: "inv_2",
      number: "RE-2026-002",
      date: "2026-04-02",
      status: "open",
      amountCents: 8640,
      currency: "EUR",
      note:
        locale === "de"
          ? "Noch offen"
          : "Still open",
    },
    {
      id: "inv_3",
      number: "RE-2026-003",
      date: "2026-03-21",
      status: "paid",
      amountCents: 42000,
      currency: "EUR",
      note:
        locale === "de"
          ? "Zahlung eingegangen"
          : "Payment received",
    },
  ];

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = invoices.filter((invoice) => invoice.status === "open");

  const totalAmountCents = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amountCents || 0),
    0
  );

  const openAmountCents = openInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amountCents || 0),
    0
  );

  return {
    user,
    locale,
    invoices,
    summary: {
      totalCount: invoices.length,
      paidCount: paidInvoices.length,
      openCount: openInvoices.length,
      totalAmountCents,
      openAmountCents,
    },
  };
}

export default function RechnungenPage() {
  const { user, locale, invoices, summary } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout
      title={t.invoices}
      subtitle={
        locale === "de"
          ? "Alle Rechnungen und Zahlungsstände deines Firmenkontos."
          : "All invoices and payment statuses for your business account."
      }
    >
      <style>{`
        .invoice-shell {
          display: grid;
          gap: 18px;
          max-width: 1180px;
        }

        .invoice-top {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 18px;
        }

        .invoice-top-card,
        .invoice-stats-card,
        .invoice-list-card {
          padding: 22px;
          border-radius: 24px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .top-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: ${colors.text};
        }

        .top-text {
          margin: 12px 0 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          max-width: 760px;
        }

        .account-grid {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }

        .account-row {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .account-row:last-child {
          border-bottom: none;
        }

        .account-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
        }

        .account-value {
          font-size: 15px;
          line-height: 1.6;
          font-weight: 700;
          color: ${colors.text};
          word-break: break-word;
        }

        .stats-grid {
          display: grid;
          gap: 12px;
        }

        .stat-box {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 16px;
          background: #fff;
        }

        .stat-box.is-success {
          background: #edf7ee;
          border-color: #cfe8d4;
        }

        .stat-box.is-warning {
          background: #fff6e9;
          border-color: #f0dfbf;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 30px;
          line-height: 1.05;
          font-weight: 800;
          color: ${colors.text};
          margin-bottom: 6px;
        }

        .stat-sub {
          font-size: 14px;
          line-height: 1.6;
          color: ${colors.muted};
        }

        .list-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .list-title {
          margin: 0 0 8px;
          font-size: 24px;
          line-height: 1.1;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .list-subtitle {
          margin: 0;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .invoice-table {
          display: grid;
          gap: 10px;
        }

        .invoice-row {
          display: grid;
          grid-template-columns: minmax(160px, 1.1fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(180px, 1fr);
          gap: 10px;
          align-items: center;
          padding: 16px;
          border: 1px solid ${colors.border};
          border-radius: 18px;
          background: #fff;
        }

        .invoice-number {
          font-size: 18px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.3;
          word-break: break-word;
        }

        .invoice-note {
          font-size: 13px;
          line-height: 1.5;
          color: ${colors.muted};
          margin-top: 4px;
        }

        .cell-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 4px;
        }

        .cell-value {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.45;
          word-break: break-word;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .empty-state {
          border: 1px dashed ${colors.border};
          border-radius: 18px;
          padding: 20px;
          background: #fff;
        }

        .empty-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
        }

        @media (max-width: 1100px) {
          .invoice-top {
            grid-template-columns: 1fr;
          }

          .invoice-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: flex-start;
          }
        }

        @media (max-width: 700px) {
          .invoice-top-card,
          .invoice-stats-card,
          .invoice-list-card {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .account-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .invoice-row {
            grid-template-columns: 1fr;
          }

          .top-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="invoice-shell">
        <section className="invoice-top">
          <div
            className="invoice-top-card"
            style={{
              ...card.base,
            }}
          >
            <div className="eyebrow">
              {locale === "de" ? "Rechnungsstatus" : "Invoice status"}
            </div>

            <h2 className="top-title">
              {locale === "de"
                ? "Zahlungsstände klar und übersichtlich verwalten."
                : "Manage payment statuses clearly and efficiently."}
            </h2>

            <p className="top-text">
              {locale === "de"
                ? "Hier findest du alle aktuellen Rechnungen deines Firmenkontos. Die Liste ist so vorbereitet, dass später echte PDF-Belege und Detailansichten sauber ergänzt werden können."
                : "Here you can find all current invoices for your business account. The structure is prepared so real PDF documents and detailed views can be added later."}
            </p>

            <div className="account-grid">
              <div className="account-row">
                <div className="account-label">
                  {locale === "de" ? "Firma" : "Company"}
                </div>
                <div className="account-value">{user.companyName || "—"}</div>
              </div>

              <div className="account-row">
                <div className="account-label">
                  {locale === "de" ? "Kontakt" : "Contact"}
                </div>
                <div className="account-value">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                </div>
              </div>

              <div className="account-row">
                <div className="account-label">E-Mail</div>
                <div className="account-value">{user.email || "—"}</div>
              </div>
            </div>
          </div>

          <div
            className="invoice-stats-card"
            style={{
              ...card.base,
            }}
          >
            <div className="stats-grid">
              <StatBox
                label={locale === "de" ? "Gesamt" : "Total"}
                value={String(summary.totalCount)}
                sub={
                  locale === "de"
                    ? "Alle aktuell gelisteten Rechnungen."
                    : "All currently listed invoices."
                }
              />

              <StatBox
                label={locale === "de" ? "Bezahlt" : "Paid"}
                value={String(summary.paidCount)}
                sub={
                  locale === "de"
                    ? "Bereits beglichene Rechnungen."
                    : "Invoices already settled."
                }
                className="is-success"
              />

              <StatBox
                label={locale === "de" ? "Offen" : "Open"}
                value={String(summary.openCount)}
                sub={
                  locale === "de"
                    ? "Noch nicht bezahlte Rechnungen."
                    : "Invoices not yet paid."
                }
                className="is-warning"
              />

              <StatBox
                label={locale === "de" ? "Offener Betrag" : "Open amount"}
                value={formatMoney(summary.openAmountCents, "EUR", locale)}
                sub={
                  locale === "de"
                    ? "Noch ausstehender Gesamtbetrag."
                    : "Outstanding total amount."
                }
              />
            </div>
          </div>
        </section>

        <section
          className="invoice-list-card"
          style={{
            ...card.base,
          }}
        >
          <div className="list-head">
            <div>
              <h3 className="list-title">{t.invoices}</h3>
              <p className="list-subtitle">
                {locale === "de"
                  ? "Rechnungsnummer, Datum, Betrag und Zahlungsstatus auf einen Blick."
                  : "Invoice number, date, amount and payment status at a glance."}
              </p>
            </div>
          </div>

          {invoices.length > 0 ? (
            <div className="invoice-table">
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-text">
                {locale === "de"
                  ? "Diesem Konto sind aktuell noch keine Rechnungen zugeordnet."
                  : "No invoices are currently assigned to this account."}
              </p>
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function StatBox({ label, value, sub, className = "" }) {
  return (
    <div className={`stat-box ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function InvoiceRow({ invoice, locale, t }) {
  const paid = invoice.status === "paid";

  return (
    <div className="invoice-row">
      <div>
        <div className="invoice-number">{invoice.number}</div>
        <div className="invoice-note">{invoice.note || ""}</div>
      </div>

      <div>
        <div className="cell-label">{t.date}</div>
        <div className="cell-value">{formatDate(invoice.date, locale)}</div>
      </div>

      <div>
        <div className="cell-label">{t.amount}</div>
        <div className="cell-value">
          {formatMoney(invoice.amountCents, invoice.currency || "EUR", locale)}
        </div>
      </div>

      <div>
        <div className="cell-label">{t.status}</div>
        <div className="cell-value">
          <StatusBadge label={paid ? t.paid : t.open} paid={paid} />
        </div>
      </div>

      <div>
        <div className="cell-label">
          {locale === "de" ? "Hinweis" : "Note"}
        </div>
        <div className="cell-value">
          {paid
            ? locale === "de"
              ? "Abgeschlossen"
              : "Completed"
            : locale === "de"
            ? "Zahlung ausstehend"
            : "Payment pending"}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, paid }) {
  return (
    <span
      className="status-badge"
      style={{
        background: paid ? "#edf7ee" : "#fff6e9",
        color: paid ? "#1f6b36" : "#8a5a00",
        border: paid ? "1px solid #cfe8d4" : "1px solid #f0dfbf",
      }}
    >
      {label}
    </span>
  );
}

function formatDate(value, locale) {
  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMoney(valueInCents, currency = "EUR", locale) {
  const value = Number(valueInCents || 0) / 100;

  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(value);
}