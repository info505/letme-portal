import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  soft: "#fbf8f2",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  goldDark: "#b8934f",
  greenBg: "#edf7ee",
  greenText: "#1f6b36",
  greenLine: "#cfe8d4",
  warnBg: "#fff8e8",
  warnText: "#8a5a00",
  warnLine: "#efdcae",
};

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const sessionUser = await getUserFromRequest(request);

  if (!sessionUser) {
    throw redirect(`/login?lang=${locale}`);
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      invoicePurchaseEnabled: true,
      isAdmin: true,
    },
  });

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const [recentOrders, totalOrdersCount, openOrdersCount, invoiceCount, openInvoices] =
    await Promise.all([
      prisma.portalOrder.findMany({
        where: { userId: user.id },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),

      prisma.portalOrder.count({
        where: { userId: user.id },
      }),

      prisma.portalOrder.count({
        where: {
          userId: user.id,
          status: {
            in: ["OPEN", "CONFIRMED", "IN_PREPARATION"],
          },
        },
      }),

      prisma.portalInvoice.count({
        where: { userId: user.id },
      }),

      prisma.portalInvoice.findMany({
        where: {
          userId: user.id,
          status: {
            in: ["OFFEN", "UEBERFAELLIG"],
          },
        },
        select: {
          amountGross: true,
        },
      }),
    ]);

  const openInvoiceAmount = openInvoices.reduce((sum, invoice) => {
    return sum + Number(invoice.amountGross || 0);
  }, 0);

  return {
    user,
    locale,
    recentOrders: recentOrders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      orderedAt: order.orderedAt ? order.orderedAt.toISOString() : null,
      deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
      subtotalAmount: order.subtotalAmount ? order.subtotalAmount.toString() : null,
      taxAmount: order.taxAmount ? order.taxAmount.toString() : null,
      totalAmount: order.totalAmount ? order.totalAmount.toString() : null,
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice ? item.unitPrice.toString() : null,
        totalPrice: item.totalPrice ? item.totalPrice.toString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    })),
    stats: {
      totalOrdersCount,
      openOrdersCount,
      invoiceCount,
      openInvoiceAmount,
    },
  };
}

export default function DashboardPage() {
  const { user, locale, recentOrders, stats } = useLoaderData();
  const t = dict[locale] || dict.de;

  const displayName =
    user.firstName || user.companyName || user.email || "Portal";

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  const invoicePurchaseEnabled =
    Boolean(user.isActive) && Boolean(user.invoicePurchaseEnabled);

  function handleOrderNow() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://letmebowl-catering.de/cart/update";

    const attrs = {
      "attributes[Portal Kunde]": "Ja",
      "attributes[Portal_User_ID]": user.id || "",
      "attributes[Portal_Email]": user.email || "",
      "attributes[Portal_Firma]": user.companyName || "",
      "attributes[Portal_Name]": fullName || user.companyName || "",
      "attributes[Portal_Konto_aktiv]": user.isActive ? "Ja" : "Nein",
      "attributes[Kunde eingeloggt]": "Ja",
      "attributes[Rechnungskauf erlaubt]": invoicePurchaseEnabled ? "Ja" : "Nein",
      "attributes[Kontaktname]": fullName || "",
      "attributes[Telefon]": user.phone || "",
      "attributes[E-Mail]": user.email || "",
      return_to: "/cart",
    };

    Object.entries(attrs).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value ?? "";
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <PortalLayout
      title={
        locale === "en"
          ? `Welcome, ${displayName}`
          : `Willkommen, ${displayName}`
      }
      subtitle={
        locale === "en"
          ? "Your central business account for orders, invoices and recurring company catering."
          : "Dein zentrales Firmenkonto für Bestellungen, Rechnungen und wiederkehrende Firmenverpflegung."
      }
      orderNowOnClick={handleOrderNow}
    >
      <style>{`
        .dashboardPage {
          width: 100%;
          max-width: 1180px;
          display: grid;
          gap: 20px;
        }

        .dashboardHero {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid ${colors.line};
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.16), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #faf6ee 100%);
          box-shadow: 0 22px 60px rgba(30,20,10,0.065);
          padding: 34px;
        }

        .dashboardHeroInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .dashboardEyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(200,169,106,0.10);
          border: 1px solid rgba(200,169,106,0.28);
          color: ${colors.goldDark};
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: ${colors.text};
          font-size: clamp(34px, 5vw, 56px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          font-weight: 950;
        }

        .dashboardHeroText {
          margin: 16px 0 0;
          max-width: 760px;
          color: ${colors.muted};
          font-size: 16px;
          line-height: 1.7;
          font-weight: 600;
        }

        .dashboardHeroActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          min-height: 54px;
          padding: 0 20px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .dashboardPrimaryBtn {
          border: 0;
          background: linear-gradient(135deg, ${colors.gold}, ${colors.goldDark});
          color: #fff;
          box-shadow: 0 16px 30px rgba(200,169,106,0.24);
        }

        .dashboardSecondaryBtn {
          border: 1px solid ${colors.line};
          background: #fff;
          color: ${colors.text};
        }

        .dashboardHeroBox {
          min-width: 250px;
          border-radius: 24px;
          border: 1px solid ${colors.line};
          background: rgba(255,255,255,0.78);
          padding: 22px;
          box-shadow: 0 14px 34px rgba(30,20,10,0.045);
        }

        .dashboardHeroBoxLabel {
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 10px;
        }

        .dashboardHeroBoxValue {
          color: ${colors.text};
          font-size: 24px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .dashboardHeroBoxText {
          margin-top: 10px;
          color: ${colors.muted};
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 650;
        }

        .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .dashboardStat {
          background: #fff;
          border: 1px solid ${colors.line};
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 16px 42px rgba(30,20,10,0.045);
          min-width: 0;
        }

        .dashboardStatLabel {
          font-size: 11.5px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${colors.muted};
          margin-bottom: 10px;
        }

        .dashboardStatValue {
          color: ${colors.text};
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
          overflow-wrap: anywhere;
        }

        .dashboardStatText {
          margin-top: 9px;
          color: ${colors.muted};
          font-size: 13.5px;
          line-height: 1.55;
          font-weight: 650;
        }

        .dashboardQuickGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .quickCard {
          border: 1px solid ${colors.line};
          border-radius: 24px;
          background: #fff;
          padding: 22px;
          box-shadow: 0 16px 42px rgba(30,20,10,0.045);
          text-decoration: none;
          color: ${colors.text};
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .quickCardIcon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: #f6efe1;
          border: 1px solid #eadfc8;
          color: ${colors.goldDark};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 950;
        }

        .quickCardTitle {
          font-size: 19px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.025em;
          color: ${colors.text};
        }

        .quickCardText {
          color: ${colors.muted};
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
        }

        .ordersCard {
          border: 1px solid ${colors.line};
          border-radius: 28px;
          background: #fff;
          box-shadow: 0 18px 50px rgba(30,20,10,0.055);
          padding: 28px;
        }

        .ordersHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .ordersTitle {
          margin: 0;
          color: ${colors.text};
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .ordersText {
          margin: 8px 0 0;
          color: ${colors.muted};
          font-size: 14.5px;
          line-height: 1.65;
          font-weight: 600;
        }

        .ordersList {
          display: grid;
          gap: 10px;
        }

        .orderRow {
          display: grid;
          grid-template-columns: minmax(180px, 1.1fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) auto;
          align-items: center;
          gap: 12px;
          border: 1px solid ${colors.line};
          background: ${colors.soft};
          border-radius: 18px;
          padding: 15px 16px;
        }

        .orderNumber {
          color: ${colors.text};
          font-size: 16px;
          line-height: 1.35;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .orderSub {
          margin-top: 4px;
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.45;
          font-weight: 650;
        }

        .orderLabel {
          color: ${colors.muted};
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .orderValue {
          color: ${colors.text};
          font-size: 14px;
          line-height: 1.45;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .statusBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .emptyState {
          border: 1px dashed #dccfba;
          background: #fffdfa;
          border-radius: 22px;
          padding: 30px;
          text-align: center;
        }

        .emptyTitle {
          margin: 0 0 8px;
          color: ${colors.text};
          font-size: 24px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .emptyText {
          margin: 0 auto;
          max-width: 620px;
          color: ${colors.muted};
          font-size: 15px;
          line-height: 1.65;
          font-weight: 600;
        }

        @media (max-width: 1100px) {
          .dashboardHeroInner {
            grid-template-columns: 1fr;
          }

          .dashboardHeroBox {
            min-width: 0;
          }

          .dashboardStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboardQuickGrid {
            grid-template-columns: 1fr;
          }

          .orderRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
          }
        }

        @media (max-width: 720px) {
          .dashboardPage {
            gap: 16px;
          }

          .dashboardHero,
          .ordersCard {
            padding: 20px 16px;
            border-radius: 22px;
          }

          .dashboardHeroTitle {
            font-size: 34px;
          }

          .dashboardHeroText {
            font-size: 14.5px;
          }

          .dashboardHeroActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .dashboardPrimaryBtn,
          .dashboardSecondaryBtn {
            width: 100%;
          }

          .dashboardStats {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .dashboardStat {
            padding: 17px;
            border-radius: 20px;
          }

          .dashboardStatValue {
            font-size: 30px;
          }

          .quickCard {
            padding: 18px;
            border-radius: 20px;
          }

          .ordersHead {
            display: grid;
            grid-template-columns: 1fr;
          }

          .ordersTitle {
            font-size: 24px;
          }

          .orderRow {
            grid-template-columns: 1fr;
            padding: 14px;
            border-radius: 16px;
          }
        }
      `}</style>

      <div className="dashboardPage">
        <section className="dashboardHero">
          <div className="dashboardHeroInner">
            <div>
              <div className="dashboardEyebrow">
                {locale === "en" ? "Business portal" : "Firmenportal"}
              </div>

              <h2 className="dashboardHeroTitle">
                {locale === "en"
                  ? "Ready for your next company order."
                  : "Bereit für deine nächste Firmenbestellung."}
              </h2>

              <p className="dashboardHeroText">
                {locale === "en"
                  ? "Start a new order, review your latest orders or manage invoices from your Let Me Bowl business account."
                  : "Starte eine neue Bestellung, prüfe deine letzten Bestellungen oder verwalte deine Rechnungen im Let Me Bowl Firmenkonto."}
              </p>

              <div className="dashboardHeroActions">
                <button
                  type="button"
                  onClick={handleOrderNow}
                  className="dashboardPrimaryBtn"
                >
                  {t.orderNow || (locale === "en" ? "Order now" : "Jetzt bestellen")}
                </button>

                <a
                  href={withLang("/bestellungen", locale)}
                  className="dashboardSecondaryBtn"
                >
                  {locale === "en" ? "View orders" : "Bestellungen ansehen"}
                </a>
              </div>
            </div>

            <div className="dashboardHeroBox">
              <div className="dashboardHeroBoxLabel">
                {locale === "en" ? "Account" : "Konto"}
              </div>

              <div className="dashboardHeroBoxValue">
                {user.companyName || user.email}
              </div>

              <div className="dashboardHeroBoxText">
                {invoicePurchaseEnabled
                  ? locale === "en"
                    ? "Invoice purchase is enabled for this account."
                    : "Rechnungskauf ist für dieses Konto freigegeben."
                  : locale === "en"
                  ? "Invoice purchase is not enabled yet."
                  : "Rechnungskauf ist noch nicht freigegeben."}
              </div>
            </div>
          </div>
        </section>

        <section className="dashboardStats">
          <StatCard
            label={locale === "en" ? "Orders" : "Bestellungen"}
            value={String(stats.totalOrdersCount || 0)}
            text={
              locale === "en"
                ? "Total linked company orders."
                : "Alle verknüpften Firmenbestellungen."
            }
          />

          <StatCard
            label={locale === "en" ? "Open" : "Offen"}
            value={String(stats.openOrdersCount || 0)}
            text={
              locale === "en"
                ? "Open, confirmed or in preparation."
                : "Offen, bestätigt oder in Vorbereitung."
            }
          />

          <StatCard
            label={locale === "en" ? "Invoices" : "Rechnungen"}
            value={String(stats.invoiceCount || 0)}
            text={
              locale === "en"
                ? "Invoices assigned to this account."
                : "Zugeordnete Rechnungen im Kundenkonto."
            }
          />

          <StatCard
            label={locale === "en" ? "Open amount" : "Offener Betrag"}
            value={formatMoney(stats.openInvoiceAmount || 0, "EUR", locale)}
            text={
              locale === "en"
                ? "Currently unpaid invoice amount."
                : "Aktuell offener Rechnungsbetrag."
            }
          />
        </section>

        <section className="dashboardQuickGrid">
          <a href={withLang("/bestellungen", locale)} className="quickCard">
            <span className="quickCardIcon">↗</span>
            <div className="quickCardTitle">
              {locale === "en" ? "Orders" : "Bestellungen"}
            </div>
            <div className="quickCardText">
              {locale === "en"
                ? "View order status, amounts and details."
                : "Status, Beträge und Details deiner Bestellungen ansehen."}
            </div>
          </a>

          <a href={withLang("/rechnungen", locale)} className="quickCard">
            <span className="quickCardIcon">€</span>
            <div className="quickCardTitle">
              {locale === "en" ? "Invoices" : "Rechnungen"}
            </div>
            <div className="quickCardText">
              {locale === "en"
                ? "Open and download your invoice PDFs."
                : "PDF-Rechnungen öffnen und herunterladen."}
            </div>
          </a>

          <a href={withLang("/rechnungsadresse", locale)} className="quickCard">
            <span className="quickCardIcon">✓</span>
            <div className="quickCardTitle">
              {locale === "en" ? "Account settings" : "Kontoeinstellungen"}
            </div>
            <div className="quickCardText">
              {locale === "en"
                ? "Manage billing details, addresses and internal settings."
                : "Rechnungsdaten, Adressen und interne Einstellungen verwalten."}
            </div>
          </a>
        </section>

        <section className="ordersCard">
          <div className="ordersHead">
            <div>
              <h3 className="ordersTitle">
                {locale === "en" ? "Recent orders" : "Letzte Bestellungen"}
              </h3>

              <p className="ordersText">
                {locale === "en"
                  ? "A quick overview of your latest company orders."
                  : "Ein schneller Überblick über deine letzten Firmenbestellungen."}
              </p>
            </div>

            <a
              href={withLang("/bestellungen", locale)}
              className="dashboardSecondaryBtn"
            >
              {locale === "en" ? "All orders" : "Alle Bestellungen"}
            </a>
          </div>

          {recentOrders.length > 0 ? (
            <div className="ordersList">
              {recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <h3 className="emptyTitle">
                {locale === "en" ? "No orders yet" : "Noch keine Bestellungen"}
              </h3>

              <p className="emptyText">
                {locale === "en"
                  ? "As soon as a company order is linked to your account, it will appear here."
                  : "Sobald eine Firmenbestellung mit deinem Konto verknüpft ist, erscheint sie hier."}
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
    <div className="dashboardStat">
      <div className="dashboardStatLabel">{label}</div>
      <div className="dashboardStatValue">{value}</div>
      <div className="dashboardStatText">{text}</div>
    </div>
  );
}

function OrderRow({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  return (
    <div className="orderRow">
      <div>
        <div className="orderNumber">{order.orderNumber || "—"}</div>
        <div className="orderSub">
          {order.items?.length
            ? locale === "en"
              ? `${order.items.length} item(s)`
              : `${order.items.length} Position(en)`
            : locale === "en"
            ? "No items saved"
            : "Keine Positionen gespeichert"}
        </div>
      </div>

      <div>
        <div className="orderLabel">{locale === "en" ? "Date" : "Datum"}</div>
        <div className="orderValue">
          {formatDate(order.orderedAt || order.createdAt, locale)}
        </div>
      </div>

      <div>
        <div className="orderLabel">{locale === "en" ? "Amount" : "Betrag"}</div>
        <div className="orderValue">
          {formatMoney(order.totalAmount, order.currency || "EUR", locale)}
        </div>
      </div>

      <div>
        <div className="orderLabel">{locale === "en" ? "Status" : "Status"}</div>
        <span className="statusBadge" style={statusStyle}>
          {statusLabel}
        </span>
      </div>

      <div>
        <a
          href={withLang(`/bestellungen/${order.id}`, locale)}
          className="dashboardSecondaryBtn"
          style={{
            minHeight: "44px",
            borderRadius: "14px",
            padding: "0 16px",
          }}
        >
          {locale === "en" ? "Details" : "Details"}
        </a>
      </div>
    </div>
  );
}

function formatDate(value, locale) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value, currency = "EUR", locale = "de") {
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? value.toNumber()
      : Number(value || 0);

  if (Number.isNaN(num)) {
    return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
      style: "currency",
      currency,
    }).format(0);
  }

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
        background: colors.greenBg,
        color: colors.greenText,
        border: `1px solid ${colors.greenLine}`,
      };

    case "CONFIRMED":
      return {
        background: "#eef4ff",
        color: "#285ea8",
        border: "1px solid #cfddf6",
      };

    case "IN_PREPARATION":
      return {
        background: colors.warnBg,
        color: colors.warnText,
        border: `1px solid ${colors.warnLine}`,
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