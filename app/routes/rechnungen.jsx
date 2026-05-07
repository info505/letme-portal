import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { prisma } from "../lib/prisma.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
import { colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

function formatDate(date, locale = "de") {
  if (!date) return "-";

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatMoney(value, locale = "de") {
  if (value === null || value === undefined) return "0,00 €";

  const num = Number(value);

  if (Number.isNaN(num)) {
    return "0,00 €";
  }

  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

function prettyStatus(status, locale = "de") {
  if (status === "BEZAHLT") return locale === "en" ? "Paid" : "Bezahlt";
  if (status === "UEBERFAELLIG") return locale === "en" ? "Overdue" : "Überfällig";
  return locale === "en" ? "Open" : "Offen";
}

function statusClass(status) {
  if (status === "BEZAHLT") return "paid";
  if (status === "UEBERFAELLIG") return "overdue";
  return "open";
}

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const invoices = await prisma.portalInvoice.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalCount = invoices.length;
  const paidCount = invoices.filter((inv) => inv.status === "BEZAHLT").length;
  const overdueCount = invoices.filter((inv) => inv.status === "UEBERFAELLIG").length;
  const openInvoices = invoices.filter((inv) => inv.status !== "BEZAHLT");

  const openAmount = openInvoices.reduce((sum, inv) => {
    return sum + Number(inv.amountGross || 0);
  }, 0);

  return {
    user,
    locale,
    invoices: invoices.map((inv) => ({
      ...inv,
      createdAt: inv.createdAt.toISOString(),
      issueDate: inv.issueDate ? inv.issueDate.toISOString() : null,
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      amountGross: inv.amountGross ? inv.amountGross.toString() : null,
    })),
    stats: {
      totalCount,
      paidCount,
      overdueCount,
      openCount: openInvoices.length,
      openAmount,
    },
  };
}

export default function RechnungenPage() {
  const { locale, invoices, stats } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout
      title={t.invoices || (locale === "en" ? "Invoices" : "Rechnungen")}
      subtitle={
        locale === "en"
          ? "Here you can view and download all invoices assigned to your business account."
          : "Hier findest du alle Rechnungen, die deinem Firmenkonto zugeordnet sind."
      }
    >
      <style>{`
        .lmbInvoicesPage {
          display: grid;
          gap: 18px;
          max-width: 1180px;
        }

        .lmbInvoicesHero {
          position: relative;
          overflow: hidden;
          padding: 30px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.13), transparent 32%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226,218,203,0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .lmbInvoicesHero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent 32%);
        }

        .lmbInvoicesHeroInner {
          position: relative;
          z-index: 1;
        }

        .lmbInvoicesEyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .lmbInvoicesTitle {
          margin: 0;
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          letter-spacing: -0.045em;
          color: ${colors.text};
          max-width: 760px;
        }

        .lmbInvoicesText {
          margin: 14px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          line-height: 1.75;
          font-size: 15px;
          font-weight: 600;
        }

        .lmbInvoiceStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .lmbInvoiceStat {
          background: #fff;
          border: 1px solid ${colors.border};
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 12px 34px rgba(24,24,24,0.035);
          min-width: 0;
        }

        .lmbInvoiceStat.isOpen {
          background: #fff8e8;
          border-color: #efdcae;
        }

        .lmbInvoiceStat.isPaid {
          background: #edf7ee;
          border-color: #cfe8d4;
        }

        .lmbInvoiceStatLabel {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 9px;
        }

        .lmbInvoiceStatValue {
          font-size: 32px;
          line-height: 1.05;
          font-weight: 900;
          color: ${colors.text};
          letter-spacing: -0.04em;
          overflow-wrap: anywhere;
        }

        .lmbInvoicesCard {
          background: #fff;
          border: 1px solid ${colors.border};
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 18px 45px rgba(24,24,24,0.05);
        }

        .lmbInvoicesCardTitle {
          margin: 0 0 8px;
          font-size: 26px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: ${colors.text};
        }

        .lmbInvoicesCardText {
          margin: 0 0 20px;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.65;
          font-weight: 600;
        }

        .lmbInvoicesList {
          display: grid;
          gap: 14px;
        }

        .lmbInvoiceItem {
          border: 1px solid #ece3d6;
          border-radius: 22px;
          padding: 20px;
          background: #fcfaf6;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: start;
        }

        .lmbInvoiceNumber {
          font-size: 21px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.025em;
          color: ${colors.text};
          margin-bottom: 12px;
          word-break: break-word;
        }

        .lmbInvoiceMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 18px;
        }

        .lmbInvoiceMetaItem span {
          display: block;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9a8d7d;
          margin-bottom: 4px;
        }

        .lmbInvoiceMetaItem strong {
          display: block;
          font-size: 14px;
          color: #332f2a;
          line-height: 1.45;
          word-break: break-word;
        }

        .lmbInvoiceSide {
          display: grid;
          justify-items: end;
          gap: 10px;
        }

        .lmbInvoiceAmount {
          font-size: 24px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.035em;
          color: ${colors.text};
          text-align: right;
        }

        .lmbInvoiceBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .lmbInvoiceBadge.open {
          background: #fbf3e3;
          color: #7a5a18;
          border: 1px solid #efdcae;
        }

        .lmbInvoiceBadge.paid {
          background: #edf6ed;
          color: #2f6b35;
          border: 1px solid #cfe7cf;
        }

        .lmbInvoiceBadge.overdue {
          background: #fbeaea;
          color: #8a2d2d;
          border: 1px solid #efc9c9;
        }

        .lmbPdfButton {
          text-decoration: none;
          background: #111;
          color: #fff;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .lmbEmptyInvoices {
          border: 1px dashed ${colors.border};
          border-radius: 22px;
          padding: 34px 20px;
          background: #fffdfa;
          color: ${colors.muted};
          font-weight: 700;
          line-height: 1.65;
          text-align: center;
        }

        .lmbEmptyInvoices strong {
          display: block;
          color: ${colors.text};
          font-size: 20px;
          margin-bottom: 8px;
        }

        @media (max-width: 980px) {
          .lmbInvoiceStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lmbInvoiceItem {
            grid-template-columns: 1fr;
          }

          .lmbInvoiceSide {
            justify-items: start;
          }

          .lmbInvoiceAmount {
            text-align: left;
          }
        }

        @media (max-width: 700px) {
          .lmbInvoicesHero,
          .lmbInvoicesCard {
            padding: 20px 16px;
            border-radius: 22px;
          }

          .lmbInvoiceStats {
            grid-template-columns: 1fr;
          }

          .lmbInvoiceMeta {
            grid-template-columns: 1fr;
          }

          .lmbInvoiceItem {
            padding: 16px;
            border-radius: 20px;
          }

          .lmbPdfButton {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      <div className="lmbInvoicesPage">
        <section className="lmbInvoicesHero">
          <div className="lmbInvoicesHeroInner">
            <div className="lmbInvoicesEyebrow">
              {locale === "en" ? "Invoices" : "Rechnungen"}
            </div>

            <h1 className="lmbInvoicesTitle">
              {locale === "en"
                ? "Your invoices at a glance."
                : "Deine Rechnungen auf einen Blick."}
            </h1>

            <p className="lmbInvoicesText">
              {locale === "en"
                ? "All invoices assigned to your business account are listed here. You can open and download each PDF directly."
                : "Alle deinem Firmenkonto zugeordneten Rechnungen werden hier angezeigt. Du kannst jede PDF direkt öffnen und herunterladen."}
            </p>
          </div>
        </section>

        <section className="lmbInvoiceStats">
          <Stat
            label={locale === "en" ? "Total" : "Gesamt"}
            value={String(stats.totalCount)}
          />

          <Stat
            label={locale === "en" ? "Open" : "Offen"}
            value={String(stats.openCount)}
            className="isOpen"
          />

          <Stat
            label={locale === "en" ? "Paid" : "Bezahlt"}
            value={String(stats.paidCount)}
            className="isPaid"
          />

          <Stat
            label={locale === "en" ? "Open amount" : "Offener Betrag"}
            value={formatMoney(stats.openAmount, locale)}
          />
        </section>

        <section className="lmbInvoicesCard">
          <h2 className="lmbInvoicesCardTitle">
            {locale === "en" ? "Invoice list" : "Rechnungsliste"}
          </h2>

          <p className="lmbInvoicesCardText">
            {locale === "en"
              ? "Open, paid and overdue invoices are shown here with due date and amount."
              : "Offene, bezahlte und überfällige Rechnungen werden hier mit Fälligkeit und Betrag angezeigt."}
          </p>

          {invoices.length === 0 ? (
            <div className="lmbEmptyInvoices">
              <strong>
                {locale === "en"
                  ? "No invoices available yet"
                  : "Noch keine Rechnungen vorhanden"}
              </strong>

              {locale === "en"
                ? "As soon as invoices are assigned to your account, they will appear here."
                : "Sobald deinem Konto Rechnungen zugeordnet wurden, erscheinen sie hier."}
            </div>
          ) : (
            <div className="lmbInvoicesList">
              {invoices.map((invoice) => (
                <InvoiceItem key={invoice.id} invoice={invoice} locale={locale} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function Stat({ label, value, className = "" }) {
  return (
    <div className={`lmbInvoiceStat ${className}`}>
      <div className="lmbInvoiceStatLabel">{label}</div>
      <div className="lmbInvoiceStatValue">{value}</div>
    </div>
  );
}

function InvoiceItem({ invoice, locale }) {
  return (
    <article className="lmbInvoiceItem">
      <div>
        <div className="lmbInvoiceNumber">
          {invoice.title || invoice.invoiceNumber}
        </div>

        <div className="lmbInvoiceMeta">
          <Meta
            label={locale === "en" ? "Invoice number" : "Rechnungsnummer"}
            value={invoice.invoiceNumber}
          />
          <Meta
            label={locale === "en" ? "Status" : "Status"}
            value={prettyStatus(invoice.status, locale)}
          />
          <Meta
            label={locale === "en" ? "Invoice date" : "Rechnungsdatum"}
            value={formatDate(invoice.issueDate || invoice.createdAt, locale)}
          />
          <Meta
            label={locale === "en" ? "Due date" : "Fällig am"}
            value={formatDate(invoice.dueDate, locale)}
          />
          <Meta
            label={locale === "en" ? "Uploaded" : "Hochgeladen"}
            value={formatDate(invoice.createdAt, locale)}
          />
          <Meta
            label={locale === "en" ? "File" : "Datei"}
            value={invoice.originalName || "PDF"}
          />
        </div>
      </div>

      <div className="lmbInvoiceSide">
        <div className="lmbInvoiceAmount">
          {invoice.amountGross ? formatMoney(invoice.amountGross, locale) : "—"}
        </div>

        <span className={`lmbInvoiceBadge ${statusClass(invoice.status)}`}>
          {prettyStatus(invoice.status, locale)}
        </span>

        {invoice.pdfUrl ? (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="lmbPdfButton"
          >
            {locale === "en" ? "Open PDF" : "PDF öffnen"}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Meta({ label, value }) {
  return (
    <div className="lmbInvoiceMetaItem">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}