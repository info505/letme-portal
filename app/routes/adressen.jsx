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

export default function AdressenPage() {
  const { user, locale } = useLoaderData();
  const t = dict[locale] || dict.de;

  return (
    <PortalLayout title={t.addressTitle} subtitle={t.addressText}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "24px",
              color: colors.text,
            }}
          >
            {t.billingAddress}
          </h3>

          <InfoRow label={t.company} value={user.companyName || "—"} />
          <InfoRow
            label={t.contactPerson}
            value={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}
          />
          <InfoRow label={t.email} value={user.email || "—"} />
          <InfoRow label={t.phone} value={user.phone || "—"} />

          <div style={{ marginTop: "20px" }}>
            <button style={button.primary}>{t.editBilling}</button>
          </div>
        </div>

        <div
          style={{
            ...card.base,
            padding: "28px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "24px",
              color: colors.text,
            }}
          >
            {t.shippingAddresses}
          </h3>

          <p
            style={{
              margin: "0 0 12px",
              color: colors.text,
              lineHeight: 1.6,
              fontSize: "15px",
            }}
          >
            {t.noShippingAddress}
          </p>

          <p
            style={{
              margin: 0,
              color: colors.muted,
              lineHeight: 1.6,
              fontSize: "15px",
            }}
          >
            {t.shippingInfoText}
          </p>

          <div style={{ marginTop: "20px" }}>
            <button style={button.secondary}>{t.addShipping}</button>
          </div>
        </div>
      </section>

      <section
        style={{
          ...card.base,
          padding: "28px",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: "24px",
            color: colors.text,
          }}
        >
          {t.quickLinks}
        </h3>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <a
            href={withLang("/dashboard", locale)}
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
              fontWeight: 700,
            }}
          >
            {t.account}
          </a>

          <a
            href={withLang("/rechnungen", locale)}
            style={{
              ...button.secondary,
              textDecoration: "none",
              color: colors.text,
              fontWeight: 700,
            }}
          >
            {t.invoices}
          </a>

          <a
            href="https://letmebowl-catering.de"
            style={{
              ...button.primary,
              textDecoration: "none",
              color: "#fff",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.orderNow}
          </a>
        </div>
      </section>
    </PortalLayout>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: colors.muted,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "16px",
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