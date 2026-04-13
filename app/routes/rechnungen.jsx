import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict } from "../lib/i18n.js";
import { card, colors, button } from "../lib/ui.js";
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

  const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
  const openCount = invoices.filter((invoice) => invoice.status === "open").length;

  return (
    <PortalLayout title={t.invoices} subtitle={t.invoiceText}>
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            ...card.base,
            padding: "30px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,244,236,1) 100%)",
            border: "1px solid #ece2d0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 420px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 12px",
                  borderRadius: "999px",
                  background: "#fff",
                  border: "1px solid #eadfc8",
                  color: "#8d6a2f",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "14px",
                }}
              >
                {t.statusNow}
              </div>

              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: "30px",
                  lineHeight: 1.15,
                  color: colors.text,
                }}
              >
                {user.companyName || "Let Me Bowl Account"}
              </h2>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  lineHeight: 1.7,
                  fontSize: "15px",
                  maxWidth: "780px",
                }}
              >
                {t.invoiceStatusTextStart}{" "}
                <strong style={{ color: colors.text }}>
                  {user.companyName}
                </strong>{" "}
                {t.invoiceStatusTextEnd}
              </p>
            </div>

            <div
              style={{
                minWidth: "220px",
                display: "grid",
                gap: "10px",
              }}
            >
              <StatPill
                label={locale === "de" ? "Bezahlt" : "Paid"}
                value={String(paidCount)}
                tone="success"
              />
              <StatPill
                label={locale === "de" ? "Offen" : "Open"}
                value={String(openCount)}
                tone="warning"
              />
              <StatPill
                label={locale === "de" ? "Gesamt" : "Total"}
                value={String(invoices.length)}
                tone="neutral"
              />
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <SummaryCard
            eyebrow={locale === "de" ? "Rechnungen" : "Invoices"}
            title={String(invoices.length)}
            text={
              locale === "de"
                ? "Alle verfügbaren Belege und Zahlungsstände im Überblick."
                : "All available invoices and payment statuses at a glance."
            }
          />

          <SummaryCard
            eyebrow={locale === "de" ? "Bezahlt" : "Paid"}
            title={String(paidCount)}
            text={
              locale === "de"
                ? "Bereits beglichene Rechnungen dieses Kontos."
                : "Invoices already settled for this account."
            }
          />

          <SummaryCard
            eyebrow={locale === "de" ? "Offen" : "Open"}
            title={String(openCount)}
            text={
              locale === "de"
                ? "Noch nicht bezahlte oder offene Posten."
                : "Invoices that are still unpaid or pending."
            }
          />
        </section>

        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "24px",
                  color: colors.text,
                }}
              >
                {t.invoices}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  lineHeight: 1.6,
                  fontSize: "14px",
                }}
              >
                {locale === "de"
                  ? "Später können hier auch PDF-Downloads und echte Rechnungsdaten eingebunden werden."
                  : "Later, PDF downloads and real invoice data can also be integrated here."}
              </p>
            </div>

            <a
              href="#"
              style={{
                ...button.secondary,
                textDecoration: "none",
                color: colors.text,
                pointerEvents: "none",
                opacity: 0.65,
              }}
            >
              {locale === "de" ? "PDF bald verfügbar" : "PDF coming soon"}
            </a>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

function SummaryCard({ eyebrow, title, text }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "22px",
        minHeight: "150px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: "10px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "34px",
          fontWeight: 800,
          color: colors.text,
          lineHeight: 1.1,
          marginBottom: "10px",
        }}
      >
        {title}
      </div>

      <p
        style={{
          margin: 0,
          color: colors.muted,
          lineHeight: 1.6,
          fontSize: "14px",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function InvoiceCard({ invoice, locale, t }) {
  const paid = invoice.status === "paid";

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "20px",
        background: "#fff",
        padding: "20px",
        display: "grid",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.muted,
              marginBottom: "8px",
            }}
          >
            {t.invoiceNumber}
          </div>

          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: colors.text,
              lineHeight: 1.2,
            }}
          >
            {invoice.number}
          </div>
        </div>

        <StatusBadge
          label={paid ? t.paid : t.open}
          paid={paid}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
        }}
      >
        <InfoBox
          label={t.date}
          value={formatDate(invoice.date, locale)}
        />
        <InfoBox
          label={t.amount}
          value={invoice.amount}
        />
        <InfoBox
          label={t.status}
          value={paid ? t.paid : t.open}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          paddingTop: "4px",
        }}
      >
        <div
          style={{
            color: colors.muted,
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {locale === "de"
            ? "PDF-Download und Detailansicht können als Nächstes angebunden werden."
            : "PDF download and detailed invoice view can be connected next."}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a
            href="#"
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
              pointerEvents: "none",
              opacity: 0.7,
            }}
          >
            {locale === "de" ? "Details" : "Details"}
          </a>

          <a
            href="#"
            style={{
              ...button.primary,
              textDecoration: "none",
              color: "#fff",
              background: "linear-gradient(135deg, #c8a96a, #b8934f)",
              pointerEvents: "none",
              opacity: 0.75,
            }}
          >
            PDF
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "14px 16px",
        background: "#fcfbf8",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ label, paid }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 800,
        background: paid ? "#edf7ee" : "#fff6e9",
        color: paid ? "#1f6b36" : "#8a5a00",
        border: paid ? "1px solid #cfe8d4" : "1px solid #f0dfbf",
      }}
    >
      {label}
    </span>
  );
}

function StatPill({ label, value, tone = "neutral" }) {
  const toneMap = {
    success: {
      bg: "#edf7ee",
      border: "#cfe8d4",
      color: "#1f6b36",
    },
    warning: {
      bg: "#fff6e9",
      border: "#f0dfbf",
      color: "#8a5a00",
    },
    neutral: {
      bg: "#fff",
      border: "#eadfc8",
      color: "#8d6a2f",
    },
  };

  const activeTone = toneMap[tone] || toneMap.neutral;

  return (
    <div
      style={{
        borderRadius: "18px",
        padding: "14px 16px",
        background: activeTone.bg,
        border: `1px solid ${activeTone.border}`,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: activeTone.color,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "24px",
          fontWeight: 800,
          color: colors.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
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