import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

const colors = {
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
        include: { items: true },
        orderBy: { createdAt: "desc" },
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
      title={locale === "en" ? `Welcome, ${displayName}` : `Willkommen, ${displayName}`}
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
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .dashboardTopGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
          gap: 16px;
          align-items: stretch;
        }

        .dashboardIntro,
        .accountPanel,
        .dashboardStat,
        .quickCard,
        .ordersPanel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        }

        .dashboardIntro {
          padding: 24px;
          display: grid;
          align-content: center;
        }

        .dashboardKicker {
          margin-bottom: 9px;
          color: #a97d2f;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .dashboardIntroTitle {
          margin: 0;
          max-width: 720px;
          color: #17191c;
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -0.045em;
        }

        .dashboardIntroText {
          margin: 10px 0 0;
          max-width: 690px;
          color: #667085;
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 500;
        }

        .dashboardActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 20px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 15px;
          border-radius: 9px;
          font-size: 12.5px;
          line-height: 1;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #ffffff;
        }

        .dashboardPrimaryBtn:hover {
          border-color: #8c6422;
          background: #8c6422;
          transform: translateY(-1px);
        }

        .dashboardSecondaryBtn {
          border: 1px solid #d0d5dd;
          background: #ffffff;
          color: #17191c;
        }

        .dashboardSecondaryBtn:hover {
          background: #f8fafc;
          border-color: #bfc5ce;
          transform: translateY(-1px);
        }

        .accountPanel {
          padding: 18px;
          display: grid;
          align-content: space-between;
          gap: 18px;
        }

        .accountPanelTop {
          display: grid;
          gap: 12px;
        }

        .accountLabel {
          color: #667085;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .accountCompany {
          color: #17191c;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .accountText {
          color: #667085;
          font-size: 12.5px;
          line-height: 1.55;
          font-weight: 500;
        }

        .accountStatus {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #cfe8d4;
          background: #edf7ee;
          color: #1f6b36;
          font-size: 11px;
          line-height: 1;
          font-weight: 800;
        }

        .accountStatus.isMuted {
          border-color: #e5e7eb;
          background: #f8fafc;
          color: #667085;
        }

        .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardStat {
          min-width: 0;
          padding: 16px;
        }

        .dashboardStatLabel {
          margin-bottom: 7px;
          color: #667085;
          font-size: 9.5px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dashboardStatValue {
          color: #17191c;
          font-size: 28px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.04em;
          overflow-wrap: anywhere;
        }

        .dashboardStatText {
          margin-top: 7px;
          color: #667085;
          font-size: 11.5px;
          line-height: 1.45;
          font-weight: 500;
        }

        .dashboardMainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
          gap: 16px;
          align-items: start;
        }

        .ordersPanel {
          overflow: hidden;
        }

        .ordersPanelHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-bottom: 1px solid #eaecf0;
        }

        .ordersTitle {
          margin: 0;
          color: #17191c;
          font-size: 21px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .ordersText {
          margin: 5px 0 0;
          color: #667085;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 500;
        }

        .ordersList {
          display: grid;
        }

        .orderRow {
          display: grid;
          grid-template-columns: minmax(180px, 1.25fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) minmax(90px, 0.55fr) auto;
          gap: 14px;
          align-items: center;
          padding: 15px 18px;
          border-bottom: 1px solid #f0f2f4;
          background: #ffffff;
        }

        .orderRow:last-child {
          border-bottom: 0;
        }

        .orderNumber {
          color: #17191c;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: -0.02em;
          overflow-wrap: anywhere;
        }

        .orderSub {
          margin-top: 3px;
          color: #667085;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 500;
        }

        .orderLabel {
          margin-bottom: 4px;
          color: #667085;
          font-size: 9px;
          line-height: 1.2;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .orderValue {
          color: #17191c;
          font-size: 12.5px;
          line-height: 1.3;
          font-weight: 800;
        }

        .statusBadge {
          width: fit-content;
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 850;
          white-space: nowrap;
        }

        .sideStack {
          display: grid;
          gap: 12px;
        }

        .quickCard {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 15px;
          color: #17191c;
          text-decoration: none;
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
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid #e2d7c3;
          background: #f8f2e7;
          color: #a97d2f;
          font-size: 13px;
          font-weight: 900;
        }

        .quickCardTitle {
          margin: 0;
          color: #17191c;
          font-size: 14px;
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: -0.015em;
        }

        .quickCardText {
          margin-top: 4px;
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        }

        .emptyState {
          padding: 28px;
          text-align: center;
          background: #f8fafc;
        }

        .emptyTitle {
          margin: 0;
          color: #17191c;
          font-size: 18px;
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .emptyText {
          max-width: 540px;
          margin: 8px auto 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.55;
          font-weight: 500;
        }

        @media (max-width: 1180px) {
          .dashboardTopGrid,
          .dashboardMainGrid {
            grid-template-columns: 1fr;
          }

          .dashboardStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .dashboardPage {
            gap: 14px;
          }

          .dashboardIntro,
          .accountPanel,
          .dashboardStat,
          .quickCard,
          .ordersPanel {
            border-radius: 12px;
          }

          .dashboardIntro {
            padding: 18px;
          }

          .dashboardActions {
            display: grid;
          }

          .dashboardPrimaryBtn,
          .dashboardSecondaryBtn {
            width: 100%;
          }

          .dashboardStats {
            grid-template-columns: 1fr;
          }

          .ordersPanelHead {
            display: grid;
          }

          .orderRow {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>

      <div className="dashboardPage">
        <section className="dashboardTopGrid">
          <div className="dashboardIntro">
            <div className="dashboardKicker">
              {locale === "en" ? "Business portal" : "Firmenportal"}
            </div>

            <h2 className="dashboardIntroTitle">
              {locale === "en"
                ? "Your company catering account at a glance."
                : "Dein Firmenkonto für Catering und Bestellungen."}
            </h2>

            <p className="dashboardIntroText">
              {locale === "en"
                ? "Review orders, invoices and account details in one clean business portal."
                : "Prüfe Bestellungen, Rechnungen und Kontodaten in einer zentralen Übersicht."}
            </p>

            <div className="dashboardActions">
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

          <aside className="accountPanel">
            <div className="accountPanelTop">
              <div className="accountLabel">
                {locale === "en" ? "Company account" : "Firmenkonto"}
              </div>

              <div className="accountCompany">
                {user.companyName || user.email}
              </div>

              <div className="accountText">
                {invoicePurchaseEnabled
                  ? locale === "en"
                    ? "Invoice purchase is enabled for this account."
                    : "Rechnungskauf ist für dieses Konto freigegeben."
                  : locale === "en"
                  ? "Invoice purchase is not enabled yet."
                  : "Rechnungskauf ist noch nicht freigegeben."}
              </div>
            </div>

            <span className={`accountStatus ${invoicePurchaseEnabled ? "" : "isMuted"}`}>
              {invoicePurchaseEnabled
                ? locale === "en"
                  ? "Active"
                  : "Aktiv"
                : locale === "en"
                ? "Pending"
                : "Ausstehend"}
            </span>
          </aside>
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

        <section className="dashboardMainGrid">
          <section className="ordersPanel">
            <div className="ordersPanelHead">
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

          <aside className="sideStack">
            <a href={withLang("/bestellungen", locale)} className="quickCard">
              <span className="quickCardIcon">↗</span>
              <div>
                <div className="quickCardTitle">
                  {locale === "en" ? "Orders" : "Bestellungen"}
                </div>
                <div className="quickCardText">
                  {locale === "en"
                    ? "View status, amounts and details."
                    : "Status, Beträge und Details ansehen."}
                </div>
              </div>
            </a>

            <a href={withLang("/rechnungen", locale)} className="quickCard">
              <span className="quickCardIcon">€</span>
              <div>
                <div className="quickCardTitle">
                  {locale === "en" ? "Invoices" : "Rechnungen"}
                </div>
                <div className="quickCardText">
                  {locale === "en"
                    ? "Open and download invoice PDFs."
                    : "PDF-Rechnungen öffnen und herunterladen."}
                </div>
              </div>
            </a>

            <a href={withLang("/rechnungsadresse", locale)} className="quickCard">
              <span className="quickCardIcon">✓</span>
              <div>
                <div className="quickCardTitle">
                  {locale === "en" ? "Account settings" : "Kontoeinstellungen"}
                </div>
                <div className="quickCardText">
                  {locale === "en"
                    ? "Manage billing details and addresses."
                    : "Rechnungsdaten und Adressen verwalten."}
                </div>
              </div>
            </a>
          </aside>
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
        background: "#f3f4f6",
        color: "#344054",
        border: "1px solid #e5e7eb",
      };
  }
}