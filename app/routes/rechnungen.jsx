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

  // Noch keine echten Rechnungen angebunden:
  // Hier später DB-Daten aus deiner Admin-/Upload-Oberfläche laden
  const invoices = [];

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

        .empty-state {
          border: 1px dashed ${colors.border};
          border-radius: 20px;
          padding: 26px;
          background: #fff;
        }

        .empty-title {
          margin: 0 0 10px;
          font-size: 24px;
          line-height: 1.1;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .empty-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          max-width: 760px;
        }

        .future-box {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .future-item {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid ${colors.border};
          background: #fcfbf8;
        }

        .future-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 6px;
        }

        .future-value {
          font-size: 14px;
          line-height: 1.6;
          font-weight: 600;
          color: ${colors.text};
        }

        @media (max-width: 1100px) {
          .invoice-top {
            grid-template-columns: 1fr;
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
              {locale === "de" ? "Rechnungsbereich" : "Invoice area"}
            </div>

            <h2 className="top-title">
              {locale === "de"
                ? "Rechnungen später sauber pro Firma bereitstellen."
                : "Provide invoices cleanly per company later on."}
            </h2>

            <p className="top-text">
              {locale === "de"
                ? "Aktuell sind noch keine echten Rechnungen im Portal hinterlegt. Diese Seite ist bewusst leer vorbereitet, damit du später über deine Admin-Oberfläche PDF-Rechnungen hochladen und einzelnen Firmenkonten sauber zuordnen kannst."
                : "There are currently no real invoices stored in the portal. This page is intentionally prepared as an empty base so you can later upload PDF invoices through your admin interface and assign them cleanly to specific company accounts."}
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
                    ? "Aktuell sichtbare Rechnungen."
                    : "Currently visible invoices."
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
                  ? "Hier erscheinen später nur echte, hochgeladene PDF-Rechnungen."
                  : "Only real uploaded PDF invoices will appear here later."}
              </p>
            </div>
          </div>

          <div className="empty-state">
            <h4 className="empty-title">
              {locale === "de"
                ? "Noch keine Rechnungen hinterlegt"
                : "No invoices uploaded yet"}
            </h4>

            <p className="empty-text">
              {locale === "de"
                ? "Sobald du in deiner späteren Admin-Oberfläche Rechnungen als PDF hochlädst und dieser Firma zuweist, erscheinen sie genau hier."
                : "As soon as you upload PDF invoices in your future admin interface and assign them to this company, they will appear here."}
            </p>

            <div className="future-box">
              <div className="future-item">
                <div className="future-label">
                  {locale === "de" ? "Späterer Ablauf" : "Later workflow"}
                </div>
                <div className="future-value">
                  {locale === "de"
                    ? "Admin lädt PDF hoch → Rechnung wird einer Firma zugeordnet → Kunde sieht nur seine eigenen Rechnungen im Portal."
                    : "Admin uploads PDF → invoice is assigned to one company → customer only sees their own invoices in the portal."}
                </div>
              </div>

              <div className="future-item">
                <div className="future-label">
                  {locale === "de" ? "Wichtiger Vorteil" : "Key benefit"}
                </div>
                <div className="future-value">
                  {locale === "de"
                    ? "Du vermeidest Fake-Daten im Frontend und baust direkt auf einer sauberen echten Struktur auf."
                    : "You avoid fake frontend data and build directly on a clean real structure."}
                </div>
              </div>
            </div>
          </div>
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

function formatMoney(valueInCents, currency = "EUR", locale) {
  const value = Number(valueInCents || 0) / 100;

  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(value);
}