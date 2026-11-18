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