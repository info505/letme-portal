import { redirect, useLoaderData } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import { card, button, colors } from "../lib/ui.js";
import PortalLayout from "../components/PortalLayout.jsx";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  return {
    user,
    locale,
  };
}

export default function DashboardPage() {
  const { user, locale } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout
      title={`${t.welcome}, ${user.firstName || user.username || "User"}`}
      subtitle={t.accountText}
    >
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <InfoCard title={t.company} value={user.companyName || "—"} />
        <InfoCard title={t.username} value={user.username || "—"} />
        <InfoCard title={t.email} value={user.email || "—"} />
        <InfoCard title={t.phone} value={user.phone || "—"} />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        <ActionCard
          title={t.addresses}
          text={t.addressesText}
          href={withLang("/adressen", locale)}
          cta={t.openAddresses}
        />

        <ActionCard
          title={t.invoices}
          text={t.invoicesText}
          href={withLang("/rechnungen", locale)}
          cta={t.openInvoices}
        />

        <ActionCard
          title={t.orderNow}
          text={t.orderNowText}
          href="https://letmebowl-catering.de"
          cta={t.startOrder}
          primary
        />
      </section>
    </PortalLayout>
  );
}

function InfoCard({ title, value }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "24px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: "10px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: colors.text,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionCard({ title, text, href, cta, primary = false }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "220px",
      }}
    >
      <div>
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: "22px",
            color: colors.text,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: colors.muted,
            lineHeight: 1.6,
            fontSize: "15px",
          }}
        >
          {text}
        </p>
      </div>

      <div style={{ marginTop: "22px" }}>
        <a
          href={href}
          style={{
            ...(primary ? button.primary : button.secondary),
            textDecoration: "none",
            color: primary ? "#fff" : colors.text,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}