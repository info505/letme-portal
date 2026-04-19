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

  const [
    defaultDeliveryAddress,
    activeCostCenter,
    deliveryAddressCount,
    costCenterCount,
    recentOrders,
    totalOrdersCount,
  ] = await Promise.all([
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

    prisma.portalOrder.count({
      where: {
        userId: user.id,
      },
    }),
  ]);

  const openOrdersCount = recentOrders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length;

  return {
    user,
    locale,
    defaultDeliveryAddress,
    activeCostCenter,
    deliveryAddressCount,
    costCenterCount,
    recentOrders,
    totalOrdersCount,
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
    recentOrders,
    totalOrdersCount,
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
          ? "Your central business account for orders and internal structures."
          : "Dein zentrales Firmenkonto für Bestellungen und interne Strukturen."
      }
      orderNowOnClick={handleOrderNow}
    >
      <style>{`
        .dashboard-shell {
          display: grid;
          gap: 18px;
          max-width: 1180px;
        }

        .topbar-card {
          padding: 22px 24px;
          border-radius: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        .topbar-left {
          min-width: 0;
          flex: 1 1 420px;
        }

        .topbar-title {
          margin: 0 0 8px;
          font-size: 28px;
          line-height: 1.08;
          color: ${colors.text};
          letter-spacing: -0.03em;
        }

        .topbar-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.65;
          max-width: 760px;
        }

        .topbar-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .stat-card {
          padding: 18px;
          border-radius: 20px;
          background: #fff;
          border: 1px solid ${colors.border};
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
          font-size: 32px;
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

        .content-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .panel {
          padding: 24px;
          border-radius: 24px;
        }

        .panel-title {
          margin: 0 0 18px;
          font-size: 24px;
          line-height: 1.1;
          color: ${colors.text};
          letter-spacing: -0.02em;
        }

        .badge {
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

        .info-box {
          border: 1px solid ${colors.border};
          border-radius: 18px;
          padding: 18px;
          background: #fff;
        }

        .info-box.is-active {
          background: #fcf8ef;
        }

        .info-row {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
        }

        .info-value {
          font-size: 15px;
          line-height: 1.6;
          color: ${colors.text};
          word-break: break-word;
          font-weight: 600;
        }

        .empty-text {
          margin: 0;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.7;
        }

        .soft-link {
          display: inline-flex;
          margin-top: 14px;
          text-decoration: none;
          color: ${colors.text};
          font-weight: 700;
        }

        .orders-card {
          padding: 24px;
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

        .orders-table {
          display: grid;
          gap: 10px;
        }

        .order-row {
          display: grid;
          grid-template-columns: minmax(180px, 1.1fr) minmax(110px, 0.7fr) minmax(110px, 0.7fr) minmax(120px, 0.7fr) auto;
          gap: 10px;
          align-items: center;
          border: 1px solid ${colors.border};
          border-radius: 16px;
          background: #fff;
          padding: 14px 16px;
        }

        .order-cell {
          min-width: 0;
        }

        .order-number {
          font-size: 16px;
          font-weight: 800;
          color: ${colors.text};
          line-height: 1.35;
          word-break: break-word;
        }

        .order-sub {
          font-size: 13px;
          color: ${colors.muted};
          line-height: 1.5;
          margin-top: 4px;
          word-break: break-word;
        }

        .order-meta-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 4px;
        }

        .order-meta-value {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.4;
          word-break: break-word;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .empty-state {
          border: 1px dashed ${colors.border};
          border-radius: 18px;
          padding: 22px;
          background: #fff;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .order-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: flex-start;
          }
        }

        @media (max-width: 700px) {
          .topbar-card,
          .panel,
          .orders-card {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .info-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .order-row {
            grid-template-columns: 1fr;
          }

          .topbar-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <section
          className="topbar-card"
          style={{
            ...card.base,
          }}
        >
          <div className="topbar-left">
            <h2 className="topbar-title">
              {locale === "en"
                ? "Ready for your next business order"
                : "Bereit für deine nächste Firmenbestellung"}
            </h2>

            <p className="topbar-text">
              {locale === "en"
                ? "Start a new order with your saved business data or jump directly to your latest orders."
                : "Starte eine neue Bestellung mit deinen gespeicherten Firmendaten oder springe direkt zu deinen letzten Bestellungen."}
            </p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              onClick={handleOrderNow}
              style={{
                ...button.primary,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #c8a96a, #b8934f)",
                fontWeight: 800,
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
                background: "#fff",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {locale === "en" ? "View orders" : "Bestellungen"}
            </a>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard
            label={locale === "en" ? "Orders total" : "Bestellungen gesamt"}
            value={String(totalOrdersCount || 0)}
            text={
              locale === "en"
                ? "All linked business orders."
                : "Alle verknüpften Firmenbestellungen."
            }
          />

          <StatCard
            label={locale === "en" ? "Open orders" : "Offene Bestellungen"}
            value={String(openOrdersCount || 0)}
            text={
              locale === "en"
                ? "Open, confirmed or in preparation."
                : "Offen, bestätigt oder in Vorbereitung."
            }
          />

          <StatCard
            label={locale === "en" ? "Delivery addresses" : "Lieferadressen"}
            value={String(deliveryAddressCount || 0)}
            text={
              locale === "en"
                ? "Saved for future orders."
                : "Für künftige Bestellungen gespeichert."
            }
          />

          <StatCard
            label={locale === "en" ? "Cost centers" : "Kostenstellen"}
            value={String(costCenterCount || 0)}
            text={
              locale === "en"
                ? "Available for internal assignment."
                : "Für interne Zuordnung verfügbar."
            }
          />
        </section>

        <section className="content-grid">
          <div
            className="panel"
            style={{
              ...card.base,
            }}
          >
            <h3 className="panel-title">
              {locale === "en" ? "Active delivery address" : "Aktive Lieferadresse"}
            </h3>

            <div className={`info-box ${defaultDeliveryAddress ? "is-active" : ""}`}>
              <div className="badge">
                {locale === "en" ? "Used for checkout" : "Wird im Checkout genutzt"}
              </div>

              {defaultDeliveryAddress ? (
                <>
                  <div className="info-row">
                    <div className="info-label">
                      {locale === "en" ? "Label" : "Bezeichnung"}
                    </div>
                    <div className="info-value">
                      {defaultDeliveryAddress.label || "—"}
                    </div>
                  </div>

                  <div className="info-row">
                    <div className="info-label">
                      {locale === "en" ? "Address" : "Adresse"}
                    </div>
                    <div className="info-value">
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
                    <div className="info-row">
                      <div className="info-label">
                        {locale === "en" ? "Contact" : "Kontakt"}
                      </div>
                      <div className="info-value">
                        {[defaultDeliveryAddress.contactName, defaultDeliveryAddress.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  )}

                  <a
                    href={withLang("/lieferadressen", locale)}
                    className="soft-link"
                  >
                    {locale === "en"
                      ? "Manage delivery addresses"
                      : "Lieferadressen verwalten"}
                  </a>
                </>
              ) : (
                <>
                  <p className="empty-text">
                    {locale === "en"
                      ? "No active delivery address has been selected yet."
                      : "Es wurde noch keine aktive Lieferadresse ausgewählt."}
                  </p>

                  <a
                    href={withLang("/lieferadressen", locale)}
                    className="soft-link"
                  >
                    {locale === "en"
                      ? "Add delivery address"
                      : "Lieferadresse anlegen"}
                  </a>
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
            <h3 className="panel-title">
              {locale === "en" ? "Active cost center" : "Aktive Kostenstelle"}
            </h3>

            <div className={`info-box ${activeCostCenter ? "is-active" : ""}`}>
              <div className="badge">
                {locale === "en"
                  ? "Internal assignment"
                  : "Interne Zuordnung"}
              </div>

              {activeCostCenter ? (
                <>
                  <div className="info-row">
                    <div className="info-label">
                      {locale === "en" ? "Name" : "Name"}
                    </div>
                    <div className="info-value">{activeCostCenter.name}</div>
                  </div>

                  <div className="info-row">
                    <div className="info-label">
                      {locale === "en" ? "Code" : "Code"}
                    </div>
                    <div className="info-value">{activeCostCenter.code || "—"}</div>
                  </div>

                  <div className="info-row">
                    <div className="info-label">
                      {locale === "en" ? "Description" : "Beschreibung"}
                    </div>
                    <div className="info-value">
                      {activeCostCenter.description || "—"}
                    </div>
                  </div>

                  <a
                    href={withLang("/kostenstellen", locale)}
                    className="soft-link"
                  >
                    {locale === "en"
                      ? "Manage cost centers"
                      : "Kostenstellen verwalten"}
                  </a>
                </>
              ) : (
                <>
                  <p className="empty-text">
                    {locale === "en"
                      ? "No active cost center has been selected yet."
                      : "Es wurde noch keine aktive Kostenstelle ausgewählt."}
                  </p>

                  <a
                    href={withLang("/kostenstellen", locale)}
                    className="soft-link"
                  >
                    {locale === "en"
                      ? "Add cost center"
                      : "Kostenstelle anlegen"}
                  </a>
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
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "24px",
                  lineHeight: 1.1,
                  color: colors.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {locale === "en" ? "Recent orders" : "Letzte Bestellungen"}
              </h3>

              <p className="orders-subtitle">
                {locale === "en"
                  ? "Your latest linked orders with status and amount."
                  : "Deine letzten verknüpften Bestellungen mit Status und Betrag."}
              </p>
            </div>

            <a
              href={withLang("/bestellungen", locale)}
              style={{
                ...button.secondary,
                textDecoration: "none",
                color: colors.text,
                background: "#fff",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {locale === "en" ? "All orders" : "Alle Bestellungen"}
            </a>
          </div>

          {recentOrders.length > 0 ? (
            <div className="orders-table">
              {recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-text">
                {locale === "en"
                  ? "No orders are linked to this account yet."
                  : "Diesem Konto sind aktuell noch keine Bestellungen zugeordnet."}
              </p>
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

function OrderRow({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  return (
    <div className="order-row">
      <div className="order-cell">
        <div className="order-number">{order.orderNumber}</div>
        <div className="order-sub">
          {order.deliveryAddress?.label
            ? locale === "en"
              ? `Delivery address: ${order.deliveryAddress.label}`
              : `Lieferadresse: ${order.deliveryAddress.label}`
            : locale === "en"
            ? "No delivery address assigned"
            : "Keine Lieferadresse zugeordnet"}
        </div>
      </div>

      <div className="order-cell">
        <div className="order-meta-label">
          {locale === "en" ? "Date" : "Datum"}
        </div>
        <div className="order-meta-value">{formatDate(order.createdAt, locale)}</div>
      </div>

      <div className="order-cell">
        <div className="order-meta-label">
          {locale === "en" ? "Amount" : "Betrag"}
        </div>
        <div className="order-meta-value">
          {formatMoney(order.totalAmount, order.currency || "EUR", locale)}
        </div>
      </div>

      <div className="order-cell">
        <div className="order-meta-label">
          {locale === "en" ? "Status" : "Status"}
        </div>
        <div>
          <span className="status-badge" style={statusStyle}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="order-cell" style={{ display: "flex", justifyContent: "flex-end" }}>
        <a
          href={withLang(`/bestellungen/${order.id}`, locale)}
          style={{
            ...button.secondary,
            textDecoration: "none",
            color: colors.text,
            background: "#fff",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {locale === "en" ? "Details" : "Details"}
        </a>
      </div>
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