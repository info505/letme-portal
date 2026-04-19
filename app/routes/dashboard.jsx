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

  return {
    user,
    locale,
    defaultDeliveryAddress,
    activeCostCenter,
  };
}

export default function DashboardPage() {
  const { user, locale, defaultDeliveryAddress, activeCostCenter } =
    useLoaderData();

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
      title={locale === "en" ? "Dashboard" : "Dashboard"}
      subtitle={
        locale === "en"
          ? "Your central business account for orders, delivery addresses and internal order setup."
          : "Dein zentrales Firmenkonto für Bestellungen, Lieferadressen und interne Bestellstruktur."
      }
    >
      <style>{`
        .dashboard-shell {
          display: grid;
          gap: 18px;
          max-width: 1120px;
        }

        .dashboard-hero {
          position: relative;
          overflow: hidden;
          padding: 34px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 30%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226, 218, 203, 0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .dashboard-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent 30%);
        }

        .dashboard-hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(280px, 360px);
          gap: 22px;
          align-items: stretch;
        }

        .dashboard-eyebrow {
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

        .dashboard-copy {
          margin: 16px 0 0;
          max-width: 700px;
          color: ${colors.muted};
          line-height: 1.75;
          font-size: 16px;
        }

        .dashboard-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .dashboard-user-card {
          display: grid;
          gap: 12px;
        }

        .dashboard-user-box {
          padding: 20px;
          border-radius: 22px;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(227, 219, 204, 0.95);
          box-shadow: 0 10px 28px rgba(24,24,24,0.03);
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .dashboard-card {
          padding: 26px;
          border-radius: 24px;
        }

        .dashboard-card-title {
          margin: 0 0 18px;
          font-size: 24px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .dashboard-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f2eadb;
          color: #8d6a2f;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .dashboard-empty-note {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
        }

        .dashboard-soft-link {
          text-decoration: none;
          color: ${colors.text};
          font-weight: 700;
        }

        .dashboard-overview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .dashboard-overview-box {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 18px;
          background: #fff;
        }

        @media (max-width: 980px) {
          .dashboard-hero-grid,
          .dashboard-main-grid,
          .dashboard-overview-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-hero,
          .dashboard-card {
            padding: 20px 16px;
            border-radius: 20px;
          }

          .dashboard-card-title {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <section className="dashboard-hero">
          <div className="dashboard-hero-grid">
            <div>
              <div className="dashboard-eyebrow">
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
                  ? "Manage your business orders centrally."
                  : "Verwalte deine Firmenbestellungen zentral an einem Ort."}
              </h1>

              <p className="dashboard-copy">
                {locale === "en"
                  ? "Use your saved delivery address and cost center directly for the next catering order."
                  : "Nutze deine gespeicherte Lieferadresse und Kostenstelle direkt für die nächste Catering-Bestellung."}
              </p>

              <div className="dashboard-actions">
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
                    minHeight: "52px",
                    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                    boxShadow: "0 14px 30px rgba(200,169,106,0.2)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.orderNow}
                </button>

                <a
                  href={withLang("/bestellungen", locale)}
                  style={{
                    ...button.secondary,
                    textDecoration: "none",
                    color: colors.text,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    minHeight: "52px",
                    background: "#fff",
                  }}
                >
                  {locale === "en" ? "View orders" : "Bestellungen ansehen"}
                </a>
              </div>
            </div>

            <div className="dashboard-user-card">
              <div className="dashboard-user-box">
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
                  {locale === "en" ? "Company" : "Firma"}
                </div>

                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: colors.text,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {user.companyName || "—"}
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    color: colors.muted,
                    fontSize: "14px",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  {user.email || "—"}
                </div>
              </div>

              <div className="dashboard-user-box">
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
                  {locale === "en" ? "User" : "Benutzer"}
                </div>

                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: colors.text,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}
                >
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    user.username ||
                    "—"}
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    color: colors.muted,
                    fontSize: "14px",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  {user.phone || "—"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="dashboard-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="dashboard-card-title">
            {locale === "en"
              ? "Current order setup"
              : "Aktuelle Bestellgrundlage"}
          </h2>

          <div className="dashboard-main-grid">
            <div
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: "20px",
                padding: "20px",
                background: defaultDeliveryAddress ? "#fcf8ef" : "#fff",
              }}
            >
              <div className="dashboard-badge">
                {locale === "en"
                  ? "Active delivery address"
                  : "Aktive Lieferadresse"}
              </div>

              {defaultDeliveryAddress ? (
                <>
                  <AddressLine
                    strong
                    value={
                      defaultDeliveryAddress.label ||
                      (locale === "en" ? "Delivery address" : "Lieferadresse")
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
                      className="dashboard-soft-link"
                    >
                      {locale === "en"
                        ? "Manage delivery addresses"
                        : "Lieferadressen verwalten"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="dashboard-empty-note">
                    {locale === "en"
                      ? "No active delivery address has been selected yet."
                      : "Es wurde noch keine aktive Lieferadresse ausgewählt."}
                  </p>

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/lieferadressen", locale)}
                      className="dashboard-soft-link"
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
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: "20px",
                padding: "20px",
                background: activeCostCenter ? "#fcf8ef" : "#fff",
              }}
            >
              <div className="dashboard-badge">
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
                      className="dashboard-soft-link"
                    >
                      {locale === "en"
                        ? "Manage cost centers"
                        : "Kostenstellen verwalten"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="dashboard-empty-note">
                    {locale === "en"
                      ? "No active cost center has been selected yet."
                      : "Es wurde noch keine aktive Kostenstelle ausgewählt."}
                  </p>

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/kostenstellen", locale)}
                      className="dashboard-soft-link"
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
          className="dashboard-card"
          style={{
            ...card.base,
          }}
        >
          <h2 className="dashboard-card-title">
            {locale === "en" ? "Account overview" : "Kontoübersicht"}
          </h2>

          <div className="dashboard-overview-grid">
            <OverviewCard
              title={locale === "en" ? "Company" : "Firma"}
              value={user.companyName || "—"}
            />
            <OverviewCard
              title={locale === "en" ? "Username" : "Benutzername"}
              value={user.username || "—"}
            />
            <OverviewCard
              title={locale === "en" ? "E-mail" : "E-Mail"}
              value={user.email || "—"}
            />
            <OverviewCard
              title={locale === "en" ? "Phone" : "Telefon"}
              value={user.phone || "—"}
            />
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}

function OverviewCard({ title, value }) {
  return (
    <div className="dashboard-overview-box">
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