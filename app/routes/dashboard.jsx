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

  const [defaultDeliveryAddress, activeCostCenter, deliveryAddressCount, costCenterCount, orders] =
    await Promise.all([
      prisma.deliveryAddress.findFirst({
        where: {
          userId: user.id,
          isDefault: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.costCenter.findFirst({
        where: {
          userId: user.id,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.deliveryAddress.count({
        where: {
          userId: user.id,
        },
      }),

      prisma.costCenter.count({
        where: {
          userId: user.id,
        },
      }),

      prisma.portalOrder.findMany({
        where: {
          userId: user.id,
        },
        include: {
          items: true,
          costCenter: true,
          deliveryAddress: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ]);

  const openOrdersCount = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length;

  return {
    user,
    locale,
    defaultDeliveryAddress,
    activeCostCenter,
    deliveryAddressCount,
    costCenterCount,
    orders,
    openOrdersCount,
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
    orders,
    openOrdersCount,
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
      "attributes[Kontaktname]": [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" "),
      "attributes[Telefon]": user.phone || "",
      "attributes[E-Mail]": user.email || "",
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
      title={
        locale === "en"
          ? `Welcome, ${user.firstName || user.companyName || "User"}`
          : `Willkommen, ${user.firstName || user.companyName || "User"}`
      }
      subtitle={
        locale === "en"
          ? "Your business account for orders, addresses and internal ordering structure."
          : "Dein Firmenkonto für Bestellungen, Adressen und interne Bestellstruktur."
      }
      orderNowOnClick={handleOrderNow}
    >
      <style>{`
        .dashboard-shell {
          display: grid;
          gap: 18px;
          max-width: 1220px;
        }

        .top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
          gap: 18px;
        }

        .panel {
          border-radius: 24px;
          padding: 24px;
        }

        .hero-panel {
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 28%),
            linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 100%);
          border: 1px solid rgba(226, 218, 203, 0.95);
          box-shadow: 0 18px 50px rgba(24,24,24,0.05);
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,106,0.28);
          background: rgba(255,255,255,0.72);
          color: #b8934f;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(34px, 4vw, 52px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          color: ${colors.text};
          max-width: 760px;
        }

        .hero-copy {
          margin: 16px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          line-height: 1.7;
          font-size: 16px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }

        .stats-grid {
          display: grid;
          gap: 12px;
        }

        .stat-card {
          border: 1px solid ${colors.border};
          border-radius: 20px;
          background: #fff;
          padding: 18px;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 30px;
          line-height: 1.05;
          font-weight: 800;
          color: ${colors.text};
          margin-bottom: 6px;
        }

        .stat-text {
          font-size: 14px;
          line-height: 1.6;
          color: ${colors.muted};
        }

        .middle-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .section-title {
          margin: 0 0 18px;
          font-size: 26px;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .mini-badge {
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

        .box {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 18px;
          background: #fff;
        }

        .box.active {
          background: #fcf8ef;
        }

        .box-title {
          margin: 0 0 12px;
          font-size: 20px;
          color: ${colors.text};
        }

        .muted {
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

        .summary-row {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-label {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${colors.muted};
        }

        .summary-value {
          font-size: 15px;
          color: ${colors.text};
          line-height: 1.6;
          word-break: break-word;
        }

        .orders-card {
          padding: 26px;
          border-radius: 24px;
        }

        .orders-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .orders-subtitle {
          margin: 8px 0 0;
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
        }

        .orders-list {
          display: grid;
          gap: 12px;
        }

        .order-row {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 18px;
          background: #fff;
          display: grid;
          gap: 12px;
        }

        .order-row-top {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .order-number {
          font-size: 20px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.2;
        }

        .order-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .order-meta-box {
          border: 1px solid ${colors.border};
          border-radius: 14px;
          padding: 12px 14px;
          background: #fcfbf8;
        }

        .order-meta-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 6px;
        }

        .order-meta-value {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.45;
          word-break: break-word;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
        }

        .empty-state {
          border: 1px dashed ${colors.border};
          border-radius: 18px;
          padding: 24px;
          background: #fff;
        }

        @media (max-width: 1100px) {
          .top-grid,
          .middle-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .order-meta {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .panel,
          .orders-card {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .section-title {
            font-size: 22px;
          }

          .hero-title {
            font-size: 38px;
          }

          .summary-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .order-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <section className="top-grid">
          <div
            className="panel hero-panel"
            style={{
              ...card.base,
            }}
          >
            <div className="eyebrow">
              {locale === "en" ? "Business account" : "Firmenkonto"}
            </div>

            <h2 className="hero-title">
              {locale === "en"
                ? "Manage orders, addresses and internal ordering workflows centrally."
                : "Verwalte Bestellungen, Adressen und interne Bestellabläufe zentral an einem Ort."}
            </h2>

            <p className="hero-copy">
              {locale === "en"
                ? "Use your saved company data directly for the next catering order and keep all relevant business information bundled in one place."
                : "Nutze deine hinterlegten Firmendaten direkt für die nächste Catering-Bestellung und halte alle relevanten B2B-Daten an einem Ort gebündelt."}
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
                href={withLang("/bestellungen", locale)}
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
                {locale === "en" ? "View orders" : "Bestellungen ansehen"}
              </a>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              label={locale === "en" ? "Company" : "Firma"}
              value={user.companyName || "—"}
              text={locale === "en" ? user.email || "—" : user.email || "—"}
            />

            <StatCard
              label={locale === "en" ? "User" : "Benutzer"}
              value={[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
              text={user.phone || "—"}
            />

            <StatCard
              label={locale === "en" ? "Saved delivery addresses" : "Gespeicherte Lieferadressen"}
              value={String(deliveryAddressCount || 0)}
              text={
                locale === "en"
                  ? "Available for future orders."
                  : "Für künftige Bestellungen verfügbar."
              }
            />

            <StatCard
              label={locale === "en" ? "Open orders" : "Offene Bestellungen"}
              value={String(openOrdersCount || 0)}
              text={
                locale === "en"
                  ? "Currently open, confirmed or in preparation."
                  : "Aktuell offen, bestätigt oder in Vorbereitung."
              }
            />
          </div>
        </section>

        <section className="middle-grid">
          <div
            className="panel"
            style={{
              ...card.base,
            }}
          >
            <h3 className="section-title">
              {locale === "en" ? "Current order setup" : "Aktuelle Bestellgrundlage"}
            </h3>

            <div className={`box ${defaultDeliveryAddress ? "active" : ""}`}>
              <div className="mini-badge">
                {locale === "en" ? "Active delivery address" : "Aktive Lieferadresse"}
              </div>

              {defaultDeliveryAddress ? (
                <>
                  <div className="summary-row">
                    <div className="summary-label">
                      {locale === "en" ? "Label" : "Bezeichnung"}
                    </div>
                    <div className="summary-value">
                      {defaultDeliveryAddress.label || "—"}
                    </div>
                  </div>

                  <div className="summary-row">
                    <div className="summary-label">
                      {locale === "en" ? "Address" : "Adresse"}
                    </div>
                    <div className="summary-value">
                      {[
                        [defaultDeliveryAddress.street, defaultDeliveryAddress.houseNumber]
                          .filter(Boolean)
                          .join(" "),
                        [defaultDeliveryAddress.postalCode, defaultDeliveryAddress.city]
                          .filter(Boolean)
                          .join(" "),
                        defaultDeliveryAddress.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>

                  {(defaultDeliveryAddress.contactName || defaultDeliveryAddress.phone) && (
                    <div className="summary-row">
                      <div className="summary-label">
                        {locale === "en" ? "Contact" : "Kontakt"}
                      </div>
                      <div className="summary-value">
                        {[defaultDeliveryAddress.contactName, defaultDeliveryAddress.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/lieferadressen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Manage delivery addresses"
                        : "Lieferadressen verwalten"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted">
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
          </div>

          <div
            className="panel"
            style={{
              ...card.base,
            }}
          >
            <h3 className="section-title">
              {locale === "en" ? "Internal assignment" : "Interne Zuordnung"}
            </h3>

            <div className={`box ${activeCostCenter ? "active" : ""}`}>
              <div className="mini-badge">
                {locale === "en" ? "Active cost center" : "Aktive Kostenstelle"}
              </div>

              {activeCostCenter ? (
                <>
                  <div className="summary-row">
                    <div className="summary-label">
                      {locale === "en" ? "Name" : "Name"}
                    </div>
                    <div className="summary-value">{activeCostCenter.name}</div>
                  </div>

                  <div className="summary-row">
                    <div className="summary-label">
                      {locale === "en" ? "Code" : "Code"}
                    </div>
                    <div className="summary-value">{activeCostCenter.code || "—"}</div>
                  </div>

                  <div className="summary-row">
                    <div className="summary-label">
                      {locale === "en" ? "Description" : "Beschreibung"}
                    </div>
                    <div className="summary-value">
                      {activeCostCenter.description || "—"}
                    </div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={withLang("/kostenstellen", locale)}
                      className="soft-link"
                    >
                      {locale === "en"
                        ? "Manage cost centers"
                        : "Kostenstellen verwalten"}
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted">
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
          className="orders-card"
          style={{
            ...card.base,
          }}
        >
          <div className="orders-head">
            <div>
              <h3 className="section-title" style={{ marginBottom: 0 }}>
                {locale === "en" ? "Recent orders" : "Letzte Bestellungen"}
              </h3>
              <p className="orders-subtitle">
                {locale === "en"
                  ? "Quick access to your latest orders, including status and amount."
                  : "Schnellzugriff auf deine letzten Bestellungen inklusive Status und Betrag."}
              </p>
            </div>

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
                background: "#fff",
              }}
            >
              {locale === "en" ? "All orders" : "Alle Bestellungen"}
            </a>
          </div>

          {orders.length > 0 ? (
            <div className="orders-list">
              {orders.map((order) => (
                <RecentOrderRow key={order.id} order={order} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="muted">
                {locale === "en"
                  ? "No orders are linked to your account yet."
                  : "Deinem Konto sind aktuell noch keine Bestellungen zugeordnet."}
              </p>

              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={handleOrderNow}
                  style={{
                    ...button.primary,
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {t.orderNow}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}

function StatCard({ label, value, text }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-text">{text}</div>
    </div>
  );
}

function RecentOrderRow({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  return (
    <div className="order-row">
      <div className="order-row-top">
        <div>
          <div className="order-number">{order.orderNumber}</div>
        </div>

        <span
          className="status-badge"
          style={statusStyle}
        >
          {statusLabel}
        </span>
      </div>

      <div className="order-meta">
        <MetaBox
          label={locale === "en" ? "Date" : "Datum"}
          value={formatDate(order.createdAt, locale)}
        />
        <MetaBox
          label={locale === "en" ? "Amount" : "Betrag"}
          value={formatMoney(order.totalAmount, order.currency || "EUR", locale)}
        />
        <MetaBox
          label={locale === "en" ? "Items" : "Positionen"}
          value={String(order.items?.length || 0)}
        />
        <MetaBox
          label={locale === "en" ? "Cost center" : "Kostenstelle"}
          value={order.costCenter?.name || "—"}
        />
      </div>

      <div className="order-footer">
        <div className="muted" style={{ fontSize: "13px", lineHeight: 1.5 }}>
          {order.deliveryAddress?.label
            ? locale === "en"
              ? `Delivery address: ${order.deliveryAddress.label}`
              : `Lieferadresse: ${order.deliveryAddress.label}`
            : locale === "en"
            ? "No delivery address assigned."
            : "Keine Lieferadresse zugeordnet."}
        </div>

        <a
          href={withLang(`/bestellungen/${order.id}`, locale)}
          style={{
            ...button.secondary,
            textDecoration: "none",
            color: colors.text,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            background: "#fff",
          }}
        >
          {locale === "en" ? "Details" : "Details"}
        </a>
      </div>
    </div>
  );
}

function MetaBox({ label, value }) {
  return (
    <div className="order-meta-box">
      <div className="order-meta-label">{label}</div>
      <div className="order-meta-value">{value}</div>
    </div>
  );
}

function formatDate(value, locale) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value, currency = "EUR", locale) {
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? value.toNumber()
      : Number(value || 0);

  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency,
  }).format(num);
}

function getStatusLabel(status, locale) {
  const map = {
    OPEN: locale === "en" ? "Open" : "Offen",
    CONFIRMED: locale === "en" ? "Confirmed" : "Bestätigt",
    IN_PREPARATION: locale === "en" ? "In preparation" : "In Vorbereitung",
    DELIVERED: locale === "en" ? "Delivered" : "Geliefert",
    CANCELLED: locale === "en" ? "Cancelled" : "Storniert",
  };

  return map[status] || status || "—";
}

function getStatusStyle(status) {
  switch (status) {
    case "DELIVERED":
      return {
        background: "#edf7ee",
        color: "#1f6b36",
        border: "1px solid #cfe8d4",
      };
    case "CONFIRMED":
      return {
        background: "#eef4ff",
        color: "#285ea8",
        border: "1px solid #cfddf6",
      };
    case "IN_PREPARATION":
      return {
        background: "#fff6e9",
        color: "#8a5a00",
        border: "1px solid #f0dfbf",
      };
    case "CANCELLED":
      return {
        background: "#fff1f1",
        color: "#8b2222",
        border: "1px solid #efcaca",
      };
    default:
      return {
        background: "#f3f3f3",
        color: "#555",
        border: "1px solid #dfdfdf",
      };
  }
}