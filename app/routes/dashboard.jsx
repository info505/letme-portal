import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
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

  const defaultDeliveryAddress = await prisma.deliveryAddress.findFirst({
    where: {
      userId: user.id,
      isDefault: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const activeCostCenter = await prisma.costCenter.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const deliveryAddressCount = await prisma.deliveryAddress.count({
    where: {
      userId: user.id,
    },
  });

  const costCenterCount = await prisma.costCenter.count({
    where: {
      userId: user.id,
    },
  });

  return {
    user,
    locale,
    defaultDeliveryAddress,
    activeCostCenter,
    deliveryAddressCount,
    costCenterCount,
  };
}

export default function DashboardPage() {
  const {
    user,
    locale,
    defaultDeliveryAddress,
    activeCostCenter,
    deliveryAddressCount,
    costCenterCount,
  } = useLoaderData();

  const t = dict[locale] || dict.de;

  function handleOrderNow() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://letmebowl-catering.de/cart/update";

    const attrs = {
      "attributes[Lieferadresse_ID]": defaultDeliveryAddress?.id || "",
      "attributes[Lieferadresse_Label]": defaultDeliveryAddress?.label || "",
      "attributes[Lieferadresse_Voll]": defaultDeliveryAddress
        ? [
            [defaultDeliveryAddress.street, defaultDeliveryAddress.houseNumber]
              .filter(Boolean)
              .join(" "),
            [defaultDeliveryAddress.postalCode, defaultDeliveryAddress.city]
              .filter(Boolean)
              .join(" "),
            defaultDeliveryAddress.country || "",
          ]
            .filter(Boolean)
            .join(", ")
        : "",
      "attributes[Kostenstelle_ID]": activeCostCenter?.id || "",
      "attributes[Kostenstelle_Name]": activeCostCenter?.name || "",
      "attributes[Kostenstelle_Code]": activeCostCenter?.code || "",
      return_to: "/pages/bestellen",
    };

    Object.entries(attrs).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <PortalLayout
      title={`${t.welcome}, ${user.firstName || user.companyName || "User"}`}
      subtitle={t.accountText}
    >
      <style>{`
        .dashboard-shell {
          display: grid;
          gap: 18px;
          max-width: 1120px;
        }

        .hero-card {
          position: relative;
          overflow: hidden;
          padding: 30px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 28%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226, 218, 203, 0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .hero-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent 30%);
        }

        .hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(280px, 380px);
          gap: 20px;
          align-items: stretch;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .hero-copy {
          margin: 16px 0 0;
          max-width: 640px;
          color: ${colors.muted};
          line-height: 1.75;
          font-size: 16px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .hero-side {
          display: grid;
          gap: 12px;
        }

        .mini-stat {
          padding: 18px;
          border-radius: 20px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(227, 219, 204, 0.95);
          box-shadow: 0 10px 28px rgba(24,24,24,0.03);
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }

        .section-card {
          padding: 26px;
          border-radius: 24px;
        }

        .section-title {
          margin: 0 0 18px;
          font-size: 26px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .address-box {
          border: 1px solid ${colors.border};
          border-radius: 20px;
          padding: 18px;
          background: #fff;
        }

        .address-box--active {
          background: #fcf8ef;
        }

        .address-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f2eadb;
          color: #8d6a2f;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .empty-note {
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
          margin: 0;
        }

        .soft-link {
          text-decoration: none;
          color: ${colors.text};
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .hero-grid {
            grid-template-columns: 1fr;
          }

          .hero-card,
          .section-card {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .section-title {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <section className="hero-card">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">
                {locale === "en" ? "Business account" : "Firmenkonto"}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(34px, 5vw, 54px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.04em",
                  color: colors.text,
                  maxWidth: "760px",
                }}
              >
                {locale === "en"
                  ? "Manage orders, addresses and internal ordering workflows centrally."
                  : "Verwalte Bestellungen, Adressen und interne Bestellabläufe zentral an einem Ort."}
              </h1>

              <p className="hero-copy">
                {locale === "en"
                  ? "Use your saved company data for future catering orders and keep delivery addresses, billing details and internal structures clearly organized."
                  : "Nutze deine hinterlegten Firmendaten für künftige Catering-Bestellungen und halte Lieferadressen, Rechnungsdaten und interne Strukturen übersichtlich an einem Ort."}
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  onClick={handleOrderNow}
                  style={{
                    ...button.primary,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    minHeight: "50px",
                    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                    boxShadow: "0 14px 30px rgba(200,169,106,0.2)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.orderNow}
                </button>

                <a
                  href={withLang("/lieferadressen", locale)}
                  style={{
                    ...button.secondary,
                    textDecoration: "none",
                    color: colors.text,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    minHeight: "50px",
                    background: "#fff",
                  }}
                >
                  {t.shippingAddressesNav}
                </a>
              </div>
            </div>

            <div className="hero-side">
              <MiniStat
                label={locale === "en" ? "Company" : "Firma"}
                value={user.companyName || "—"}
              />
              <MiniStat
                label={locale === "en" ? "Username" : "Benutzername"}
                value={user.username || "—"}
              />
              <MiniStat
                label={
                  locale === "en"
                    ? "Saved delivery addresses"
                    : "Gespeicherte Lieferadressen"
                }
                value={String(deliveryAddressCount || 0)}
              />
              <MiniStat
                label={locale === "en" ? "Cost centers" : "Kostenstellen"}
                value={String(costCenterCount || 0)}
              />
            </div>
          </div>
        </section>

        <section
          className="section-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="section-title">
            {locale === "en"
              ? "Current order setup"
              : "Aktuelle Bestellgrundlage"}
          </h2>

          <div className="quick-grid">
            <div
              className={`address-box ${
                defaultDeliveryAddress ? "address-box--active" : ""
              }`}
            >
              <div className="address-badge">
                {locale === "en"
                  ? "Active delivery address"
                  : "Aktive Lieferadresse"}
              </div>

              {defaultDeliveryAddress ? (
                <>
                  <AddressLine
                    strong
                    value={
                      defaultDeliveryAddress.label || t.shippingAddressesNav
                    }
                  />
                  <AddressLine value={defaultDeliveryAddress.companyName} />
                  <AddressLine value={defaultDeliveryAddress.contactName} />
                  <AddressLine
                    value={[
                      defaultDeliveryAddress.street,
                      defaultDeliveryAddress.houseNumber,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <AddressLine
                    value={[
                      defaultDeliveryAddress.postalCode,
                      defaultDeliveryAddress.city,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <AddressLine value={defaultDeliveryAddress.country} />
                  {defaultDeliveryAddress.phone ? (
                    <AddressLine value={defaultDeliveryAddress.phone} />
                  ) : null}

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/lieferadressen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Change delivery address"
                        : "Lieferadresse ändern"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-note">
                    {locale === "en"
                      ? "No active delivery address has been selected yet."
                      : "Es wurde noch keine aktive Lieferadresse ausgewählt."}
                  </p>

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/lieferadressen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Add delivery address"
                        : "Lieferadresse anlegen"}
                    </a>
                  </div>
                </>
              )}
            </div>

            <div
              className={`address-box ${
                activeCostCenter ? "address-box--active" : ""
              }`}
            >
              <div className="address-badge">
                {locale === "en"
                  ? "Active cost center"
                  : "Aktive Kostenstelle"}
              </div>

              {activeCostCenter ? (
                <>
                  <AddressLine strong value={activeCostCenter.name} />
                  {activeCostCenter.code ? (
                    <AddressLine value={activeCostCenter.code} />
                  ) : null}
                  {activeCostCenter.description ? (
                    <AddressLine value={activeCostCenter.description} />
                  ) : null}

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/kostenstellen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Change cost center"
                        : "Kostenstelle ändern"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="empty-note">
                    {locale === "en"
                      ? "No active cost center has been selected yet."
                      : "Es wurde noch keine aktive Kostenstelle ausgewählt."}
                  </p>

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/kostenstellen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Add cost center"
                        : "Kostenstelle anlegen"}
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section
          className="section-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="section-title">
            {locale === "en" ? "Account overview" : "Kontoübersicht"}
          </h2>

          <div className="info-grid">
            <OverviewCard title={t.company} value={user.companyName || "—"} />
            <OverviewCard title={t.username} value={user.username || "—"} />
            <OverviewCard title={t.email} value={user.email || "—"} />
            <OverviewCard title={t.phone} value={user.phone || "—"} />
          </div>
        </section>

        <section className="action-grid">
          <MainCard
            title={t.ordersTitle}
            text={t.ordersText}
            href={withLang("/bestellungen", locale)}
            cta={t.ordersTitle}
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

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
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
          fontSize: "18px",
          fontWeight: 800,
          color: colors.text,
          lineHeight: 1.45,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
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

function MainCard({ title, text, href, cta }) {
  return (
    <div
      style={{
        ...card.base,
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "220px",
        borderRadius: "24px",
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
            lineHeight: 1.7,
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
            ...button.secondary,
            textDecoration: "none",
            color: colors.text,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
          }}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

function AddressLine({ value, strong = false }) {
  if (!value) return null;

  return (
    <div
      style={{
        color: colors.text,
        fontSize: strong ? "16px" : "15px",
        fontWeight: strong ? 800 : 500,
        lineHeight: 1.65,
        marginBottom: "4px",
        whiteSpace: "pre-wrap",
      }}
    >
      {value}
    </div>
  );
}