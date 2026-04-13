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

  return { user, locale };
}

export default function RechnungenPage() {
  const { user, locale } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout title={t.invoices} subtitle={t.invoiceText}>
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "28px",
              color: colors.text,
            }}
          >
            {t.statusNow}
          </h3>

          <p
            style={{
              margin: 0,
              color: colors.muted,
              lineHeight: 1.6,
              fontSize: "16px",
            }}
          >
            {t.invoiceStatusTextStart}{" "}
            <strong style={{ color: colors.text }}>{user.companyName}</strong>{" "}
            {t.invoiceStatusTextEnd}
          </p>
        </section>

        <section
          style={{
            ...card.base,
            padding: "20px",
            overflowX: "auto",
          }}
        >
          <div style={{ minWidth: "640px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                gap: "16px",
                padding: "14px 16px",
                borderBottom: `1px solid ${colors.border}`,
                color: colors.muted,
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <div>{t.invoiceNumber}</div>
              <div>{t.date}</div>
              <div>{t.status}</div>
              <div>{t.amount}</div>
            </div>

            <InvoiceRow
              number="#2026-001"
              date="12.04.2026"
              status={t.paid}
              amount="189,50 €"
              paid
            />

            <InvoiceRow
              number="#2026-002"
              date="02.04.2026"
              status={t.open}
              amount="86,40 €"
            />
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

function InvoiceRow({ number, date, status, amount, paid = false }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
        gap: "16px",
        padding: "16px",
        borderBottom: `1px solid ${colors.border}`,
        alignItems: "center",
        color: colors.text,
        fontSize: "15px",
      }}
    >
      <div style={{ fontWeight: 600 }}>{number}</div>
      <div>{date}</div>
      <div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: 700,
            background: paid ? "#edf7ee" : "#fff6e9",
            color: paid ? "#1f6b36" : "#8a5a00",
            border: paid ? "1px solid #cfe8d4" : "1px solid #f0dfbf",
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ fontWeight: 600 }}>{amount}</div>
    </div>
  );
}