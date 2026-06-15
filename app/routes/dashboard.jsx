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
      <style>{
        .dashboardPage {
          width: 100%;
          max-width: 1180px;
          display: grid;
          gap: 18px;
        }

        .dashboardHero {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 22px;
        }

        .dashboardHeroInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 22px;
          align-items: center;
        }

        .dashboardEyebrow {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 8px;
          color: #a97d2f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .dashboardHeroTitle {
          margin: 0;
          max-width: 720px;
          color: #191a1d;
          font-size: clamp(25px, 3vw, 34px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

        .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 720px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }

        .dashboardHeroActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border-radius: 9px;
          font-size: 13px;
          line-height: 1;
          font-weight: 750;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .dashboardPrimaryBtn:hover {
          border-color: #8c6422;
          background: #8c6422;
          transform: translateY(-1px);
        }

        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #ffffff;
          color: #191a1d;
        }

        .dashboardSecondaryBtn:hover {
          border-color: #d0d5dd;
          background: #f8f9fa;
          transform: translateY(-1px);
        }

        .dashboardHeroBox {
          min-width: 0;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
        }

        .dashboardHeroBoxLabel {
          margin-bottom: 7px;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dashboardHeroBoxValue {
          color: #191a1d;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 650;
          letter-spacing: -0.01em;
        }

        .dashboardHeroBoxText {
          margin-top: 8px;
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 500;
        }

        .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardStat {
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
        }

        .dashboardStatLabel {
          margin-bottom: 7px;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dashboardStatValue {
          color: #191a1d;
          font-size: clamp(23px, 2.4vw, 29px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        }

        .dashboardStatText {
          margin-top: 7px;
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        }

        .dashboardQuickGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .quickCard {
          min-width: 0;
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 16px;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          background: #ffffff;
          color: #191a1d;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease,
            transform 150ms ease;
        }

        .quickCard:hover {
          border-color: #d0d5dd;
          box-shadow: 0 4px 12px rgba(16, 24, 40, 0.055);
          transform: translateY(-1px);
        }

        .quickCardIcon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #f8f2e7;
          border: 1px solid #e2d7c3;
          color: #a97d2f;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
        }

        .quickCardTitle {
          margin: 0;
          color: #191a1d;
          font-size: 15px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.015em;
        }

        .quickCardText {
          margin-top: 4px;
          color: #667085;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 500;
        }

        .ordersCard {
          overflow: hidden;
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        }

        .ordersCardHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid #eaecf0;
        }

        .ordersCardTitle {
          margin: 0;
          color: #191a1d;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .ordersCardText {
          margin: 5px 0 0;
          color: #667085;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 500;
        }

        .ordersCardLink {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          padding: 0 13px;
          border: 1px solid #e3e6ea;
          border-radius: 8px;
          background: #ffffff;
          color: #191a1d;
          font-size: 12px;
          line-height: 1;
          font-weight: 700;
          text-decoration: none;
        }

        .ordersCardLink:hover {
          border-color: #d0d5dd;
          background: #f8f9fa;
        }

        .recentOrdersList {
          display: grid;
          gap: 0;
        }

        .recentOrderRow {
          display: grid;
          grid-template-columns: minmax(220px, 1.6fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) auto;
          gap: 16px;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid #f0f2f4;
          background: #ffffff;
        }

        .recentOrderRow:last-child {
          border-bottom: 0;
        }

        .recentOrderMain {
          min-width: 0;
        }

        .recentOrderNumber {
          color: #191a1d;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.015em;
        }

        .recentOrderSub {
          margin-top: 3px;
          color: #667085;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 500;
        }

        .recentOrderMetaLabel {
          margin-bottom: 4px;
          color: #667085;
          font-size: 9px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .recentOrderMetaValue {
          color: #191a1d;
          font-size: 13px;
          line-height: 1.3;
          font-weight: 750;
        }

        .statusBadge {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          color: #344054;
          font-size: 11px;
          line-height: 1;
          font-weight: 700;
        }

        .recentOrderAction {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          border: 1px solid #e3e6ea;
          border-radius: 8px;
          background: #ffffff;
          color: #191a1d;
          font-size: 12px;
          line-height: 1;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .recentOrderAction:hover {
          border-color: #d0d5dd;
          background: #f8f9fa;
        }

        .emptyDashboardBox {
          padding: 24px;
          border: 1px dashed #d0d5dd;
          border-radius: 12px;
          background: #f8f9fa;
          text-align: center;
        }

        .emptyDashboardTitle {
          margin: 0;
          color: #191a1d;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 800;
        }

        .emptyDashboardText {
          max-width: 560px;
          margin: 8px auto 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 500;
        }

        @media (max-width: 1180px) {
          .dashboardHeroInner {
            grid-template-columns: 1fr;
          }

          .dashboardHeroBox {
            max-width: none;
          }

          .dashboardStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboardQuickGrid {
            grid-template-columns: 1fr;
          }

          .recentOrderRow {
            grid-template-columns: minmax(0, 1fr) minmax(120px, auto);
          }

          .recentOrderRow > div:nth-child(2),
          .recentOrderRow > div:nth-child(3),
          .recentOrderRow > div:nth-child(4) {
            display: none;
          }
        }

        @media (max-width: 720px) {
          .dashboardPage {
            gap: 14px;
          }

          .dashboardHero,
          .dashboardStat,
          .quickCard,
          .ordersCard {
            border-radius: 12px;
          }

          .dashboardHero {
            padding: 18px;
          }

          .dashboardHeroActions {
            display: grid;
          }

          .dashboardPrimaryBtn,
          .dashboardSecondaryBtn {
            width: 100%;
          }

          .dashboardStats {
            grid-template-columns: 1fr;
          }

          .ordersCardHead {
            display: grid;
          }

          .recentOrderRow {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .recentOrderAction {
            width: 100%;
          }
        }
      }</style>

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