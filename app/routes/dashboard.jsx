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
            title={t.addresses}
            text={t.addressesText}
            href={withLang("/adressen", locale)}
            cta={t.openAddresses}
          />

          <MainCard
            title={t.invoices}
            text={t.invoicesText}
            href={withLang("/rechnungen", locale)}
            cta={t.openInvoices}
          />
        </section>

        <section
          style={{
            ...card.base,
            padding: "28px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
            gap: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.gold,
                marginBottom: "10px",
              }}
            >
              {locale === "en" ? "Portal status" : "Portalstatus"}
            </div>

            <h3
              style={{
                margin: "0 0 10px",
                fontSize: "28px",
                lineHeight: 1.15,
                color: colors.text,
              }}
            >
              {locale === "en"
                ? "Your account area is ready for the next steps"
                : "Dein Kontobereich ist für die nächsten Schritte vorbereitet"}
            </h3>

            <p
              style={{
                margin: 0,
                color: colors.muted,
                lineHeight: 1.7,
                fontSize: "16px",
                maxWidth: "760px",
              }}
            >
              {locale === "en"
                ? "You can already manage your core business data, open your address area, review invoices and access the order section. Next we can connect more live functions step by step."
                : "Du kannst bereits deine zentralen Firmendaten verwalten, den Adressbereich öffnen, Rechnungen ansehen und den Bestellbereich nutzen. Als Nächstes können wir weitere Live-Funktionen Schritt für Schritt anbinden."}
            </p>
          </div>

          <div
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: "20px",
              padding: "18px",
              background: "#fcf9f3",
              alignSelf: "start",
            }}
          >
            <StatusItem
              label={locale === "en" ? "Login & account" : "Login & Konto"}
              active
            />
            <StatusItem
              label={locale === "en" ? "Address management" : "Adressverwaltung"}
              active
            />
            <StatusItem
              label={locale === "en" ? "Order area" : "Bestellbereich"}
              active
            />
            <StatusItem
              label={locale === "en" ? "Invoice overview" : "Rechnungsübersicht"}
              active
            />
          </div>
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
        minHeight: "230px",
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

function StatusItem({ label, active = false }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
        color: colors.text,
        fontSize: "14px",
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? "#edf7ee" : "#f4f4f4",
          border: active ? "1px solid #cfe8d4" : "1px solid #dddddd",
          color: active ? "#1f6b36" : "#666",
          fontSize: "12px",
          flexShrink: 0,
        }}
      >
        {active ? "✓" : "•"}
      </span>
      <span>{label}</span>
    </div>
  );
}