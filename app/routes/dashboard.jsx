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

  return { user, locale };
}

export default function DashboardPage() {
  const { user, locale } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout
      title={`${t.welcome}, ${user.firstName || user.companyName || "User"}`}
      subtitle={t.accountText}
    >
      <div style={{ display: "grid", gap: "18px" }}>
        <section
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <OverviewCard title={t.company} value={user.companyName || "—"} />
            <OverviewCard title={t.username} value={user.username || "—"} />
            <OverviewCard title={t.email} value={user.email || "—"} />
            <OverviewCard title={t.phone} value={user.phone || "—"} />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          <MainCard
            title={t.ordersTitle}
            text={t.ordersText}
            href={withLang("/bestellungen", locale)}
            cta={t.ordersTitle}
            primary
          />

          <MainCard
            title={t.billingAddressNav}
            text={t.billingAddressText}
            href={withLang("/rechnungsadresse", locale)}
            cta={t.billingAddressNav}
          />

          <MainCard
            title={t.shippingAddressesNav}
            text={t.shippingAddressesText}
            href={withLang("/lieferadressen", locale)}
            cta={t.shippingAddressesNav}
          />

          <MainCard
            title={t.costCentersNav}
            text={t.costCentersText}
            href={withLang("/kostenstellen", locale)}
            cta={t.costCentersNav}
          />

          <MainCard
            title={t.invoices}
            text={t.invoicesText}
            href={withLang("/rechnungen", locale)}
            cta={t.invoices}
          />
        </section>
      </div>
    </PortalLayout>
  );
}

function OverviewCard({ title, value }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "18px",
        padding: "20px",
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 800,
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
          fontWeight: 700,
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

function MainCard({ title, text, href, cta, primary = false }) {
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

      <div style={{ marginTop: "24px" }}>
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
            background: primary
              ? "linear-gradient(135deg, #c8a96a, #b8934f)"
              : "#fff",
          }}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}