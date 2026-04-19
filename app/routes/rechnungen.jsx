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

  // Platzhalterdaten – später durch echte DB-Daten ersetzen
  const invoices = [
    {
      id: "inv_1",
      number: "#2026-001",
      date: "2026-04-12",
      status: "paid",
      amount: "189,50 €",
    },
    {
      id: "inv_2",
      number: "#2026-002",
      date: "2026-04-02",
      status: "open",
      amount: "86,40 €",
    },
    {
      id: "inv_3",
      number: "#2026-003",
      date: "2026-03-21",
      status: "paid",
      amount: "420,00 €",
    },
  ];

  return { user, locale, invoices };
}

export default function RechnungenPage() {
  const { user, locale, invoices } = useLoaderData();
  const t = dict[locale] || dict.de;

  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const openInvoices = invoices.filter((invoice) => invoice.status === "open");

  return (
    <PortalLayout
      title={t.invoices}
      subtitle={
        locale === "de"
          ? "Alle Rechnungen und Zahlungsstände deines Firmenkontos im Überblick."
          : "All invoices and payment statuses for your business account at a glance."
      }
    >
      <style>{`
        .invoice-shell {
          display: grid;
          gap: 18px;
          max-width: 1220px;
        }

        .invoice-top {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 18px;
        }

        .invoice-panel {
          border-radius: 24px;
          padding: 24px;
        }

        .invoice-hero {
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 28%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226, 218, 203, 0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
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

        .hero-title {
          margin: 0;
          font-size: clamp(30px, 3.5vw, 42px);
          line-height: 1.02;
          letter-spacing: -0.04em;
          color: ${colors.text};
          max-width: 760px;
        }

        .hero-copy {
          margin: 14px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          line-height: 1.7;
          font-size: 15px;
        }

        .hero-summary {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .hero-summary-row {
          display: grid;
          grid-template-columns: 170px 1fr;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .hero-summary-row:last-child {
          border-bottom: none;
        }

        .hero-summary-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
        }

        .hero-summary-value {
          font-size: 15px;
          line-height: 1.6;
          color: ${colors.text};
          word-break: break-word;
          font-weight: 700;
        }

        .stats-grid {
          display: grid;
          gap: 12px;
        }

        .stat-card {
          border: 1px solid ${colors.border};
          border-radius: 20px;
          background: #fff;
          padding: 18px;
        }

        .stat-card.is-success {
          background: #edf7ee;
          border-color: #cfe8d4;
        }

        .stat-card.is-warning {
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
          font-size: 32px;
          line-height: 1.05;
          font-weight: 800;
          color: ${colors.text};
          margin-bottom: 6px;
        }

        .stat-text {
          font-size: 14px;
          line-height: 1.6;
          color: ${colors.muted};
        }

        .list-card {
          padding: 26px;
          border-radius: 24px;
        }

        .list-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .list-title {
          margin: 0 0 8px;
          font-size: 26px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .list-subtitle {
          margin: 0;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .invoice-list {
          display: grid;
          gap: 12px;
        }

        .invoice-row {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          background: #fff;
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .invoice-row-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
        }

        .invoice-number {
          font-size: 20px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.2;
        }

        .invoice-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .invoice-meta-box {
          border: 1px solid ${colors.border};
          border-radius: 14px;
          padding: 12px 14px;
          background: #fcfbf8;
        }

        .invoice-meta-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 6px;
        }

        .invoice-meta-value {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.45;
          word-break: break-word;
        }

        .invoice-row-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .invoice-note {
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.55;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
        }

        .empty-state {
          border: 1px dashed ${colors.border};
          border-radius: 18px;
          padding: 24px;
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
        }

        @media (max-width: 850px) {
          .invoice-meta {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .invoice-panel,
          .list-card {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .hero-summary-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .list-title {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="invoice-shell">
        <section className="invoice-top">
          <div
            className="invoice-panel invoice-hero"
            style={{
              ...card.base,
            }}
          >
            <div className="eyebrow">
              {locale === "de" ? "Zahlungsstatus" : "Payment status"}
            </div>

            <h2 className="hero-title">
              {locale === "de"
                ? "Rechnungen und Zahlungsstände sauber im Blick behalten."
                : "Keep invoices and payment statuses clearly in view."}
            </h2>

            <p className="hero-copy">
              {locale === "de"
                ? "Hier siehst du den aktuellen Stand deines Firmenkontos. Später können an dieser Stelle echte PDF-Belege, Rechnungsdetails und Zahlungsabgleiche ergänzt werden."
                : "Here you can see the current status of your business account. Later, real PDF receipts, invoice details and payment reconciliation can be added here."}
            </p>

            <div className="hero-summary">
              <div className="hero-summary-row">
                <div className="hero-summary-label">
                  {locale === "de" ? "Firma" : "Company"}
                </div>
                <div className="hero-summary-value">
                  {user.companyName || "—"}
                </div>
              </div>

              <div className="hero-summary-row">
                <div className="hero-summary-label">
                  {locale === "de" ? "Kontakt" : "Contact"}
                </div>
                <div className="hero-summary-value">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
                </div>
              </div>

              <div className="hero-summary-row">
                <div className="hero-summary-label">
                  {locale === "de" ? "E-Mail" : "Email"}
                </div>
                <div className="hero-summary-value">
                  {user.email || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              label={locale === "de" ? "Gesamt" : "Total"}
              value={String(invoices.length)}
              text={
                locale === "de"
                  ? "Alle aktuell gelisteten Rechnungen."
                  : "All currently listed invoices."
              }
            />

            <StatCard
              label={locale === "de" ? "Bezahlt" : "Paid"}
              value={String(paidInvoices.length)}
              text={
                locale === "de"
                  ? "Bereits beglichene Rechnungen."
                  : "Invoices already settled."
              }
              className="is-success"
            />

            <StatCard
              label={locale === "de" ? "Offen" : "Open"}
              value={String(openInvoices.length)}
              text={
                locale === "de"
                  ? "Noch nicht bezahlte oder offene Posten."
                  : "Invoices that are still unpaid or pending."
              }
              className="is-warning"
            />
          </div>
        </section>

        <section
          className="list-card"
          style={{
            ...card.base,
          }}
        >
          <div className="list-head">
            <div>
              <h3 className="list-title">{t.invoices}</h3>
              <p className="list-subtitle">
                {locale === "de"
                  ? "Belegnummer, Rechnungsdatum, Zahlungsstatus und Betrag auf einen Blick."
                  : "Invoice number, invoice date, payment status and amount at a glance."}
              </p>
            </div>
          </div>

          {invoices.length > 0 ? (
            <div className="invoice-list">
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
                  ? "Aktuell sind diesem Konto noch keine Rechnungen zugeordnet."
                  : "No invoices are currently assigned to this account."}
              </p>
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function StatCard({ label, value, text, className = "" }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-text">{text}</div>
    </div>
  );
}

function InvoiceRow({ invoice, locale, t }) {
  const paid = invoice.status === "paid";

  return (
    <div className="invoice-row">
      <div className="invoice-row-top">
        <div>
          <div className="invoice-number">{invoice.number}</div>
        </div>

        <StatusBadge label={paid ? t.paid : t.open} paid={paid} />
      </div>

      <div className="invoice-meta">
        <MetaBox
          label={t.date}
          value={formatDate(invoice.date, locale)}
        />
        <MetaBox
          label={t.amount}
          value={invoice.amount}
        />
        <MetaBox
          label={t.status}
          value={paid ? t.paid : t.open}
        />
      </div>

      <div className="invoice-row-footer">
        <div className="invoice-note">
          {locale === "de"
            ? "PDF-Download und Detailansicht können im nächsten Schritt angebunden werden."
            : "PDF download and detailed invoice view can be connected in the next step."}
        </div>
      </div>
    </div>
  );
}

function MetaBox({ label, value }) {
  return (
    <div className="invoice-meta-box">
      <div className="invoice-meta-label">{label}</div>
      <div className="invoice-meta-value">{value}</div>
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