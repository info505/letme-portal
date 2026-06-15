import { redirect, useLoaderData } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest, dict, withLang } from "../lib/i18n.js";
import PortalLayout from "../components/PortalLayout.jsx";

const ui = {
  bg: "#f7f4ee",
  card: "#ffffff",
  soft: "#fbf8f2",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  goldDark: "#a9823c",
  green: "#2f6a4a",
  red: "#8b2222",
  blue: "#285ea8",
  orange: "#8a5a00",
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
    },
  });

  if (!user) {
    throw redirect(`/login?lang=${locale}`);
  }

  const ordersRaw = await prisma.portalOrder.findMany({
    where: { userId: user.id },
    include: {
      items: true,
      costCenter: true,
      deliveryAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const orders = ordersRaw.map((order) => ({
    ...order,
    createdAt: order.createdAt?.toISOString(),
    updatedAt: order.updatedAt?.toISOString(),
    orderedAt: order.orderedAt?.toISOString(),
    deliveryDate: order.deliveryDate?.toISOString() || null,
    subtotalAmount: order.subtotalAmount ? Number(order.subtotalAmount) : 0,
    taxAmount: order.taxAmount ? Number(order.taxAmount) : 0,
    totalAmount: order.totalAmount ? Number(order.totalAmount) : 0,
    items: order.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
      totalPrice: item.totalPrice ? Number(item.totalPrice) : 0,
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
    })),
  }));

  return { user, locale, orders };
}

export default function BestellungenPage() {
  const { user, locale, orders } = useLoaderData();
  const t = dict[locale] || dict.de;

  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;
  const cancelledCount = orders.filter((order) => order.status === "CANCELLED").length;
  const openCount = orders.filter((order) =>
    ["OPEN", "CONFIRMED", "IN_PREPARATION"].includes(order.status)
  ).length;

  const totalAmount = orders.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  const lastOrder = orders[0] || null;

  return (
    <PortalLayout
      title={t.ordersTitle || (locale === "en" ? "Orders" : "Bestellungen")}
      subtitle={
        t.ordersText ||
        (locale === "en"
          ? "All company orders, statuses and order details in one place."
          : "Alle Firmenbestellungen, Status und Bestelldetails an einem Ort.")
      }
    >
      <style>{`
        .ordersPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
        }

        .ordersHero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          padding: 24px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #e3e6ea;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        };
          box-shadow: 0 24px 60px rgba(30,20,10,0.07);
        }

        .ordersHero::after {
          content: none;
        }

        .ordersHeroTextWrap {
          position: relative;
          z-index: 2;
          min-width: 0;
        }

        .ordersKicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          margin-bottom: 8px;
          color: #a97d2f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        };
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .ordersHeroTitle {
          margin: 0;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
          max-width: 760px;
        };
          font-size: clamp(30px, 4.3vw, 50px);
          line-height: 1.02;
          letter-spacing: -0.055em;
          font-weight: 950;
          max-width: 780px;
        }

        .ordersHeroCopy {
          margin: 9px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
          max-width: 760px;
        };
          font-size: 15px;
          line-height: 1.75;
          font-weight: 600;
          max-width: 820px;
        }

        .ordersHeroActions {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ordersBtnPrimary,
        .ordersBtnSecondary {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 9px;
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          font-weight: 700;
          box-shadow: none;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

        .ordersBtnPrimary {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 9px;
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          font-weight: 750;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }, ${ui.goldDark});
          color: #fff;
          box-shadow: 0 14px 30px rgba(200,169,106,0.24);
        }

        .ordersBtnSecondary {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 9px;
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          font-weight: 700;
          box-shadow: none;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        };
          background: #fff;
          color: ${ui.text};
        }

        .ordersStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .ordersStat {
          padding: 16px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #e3e6ea;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
        };
          box-shadow: 0 12px 34px rgba(30,20,10,0.04);
        }

        .ordersStatLabel {
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        };
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .ordersStatValue {
          color: #191a1d;
          font-size: clamp(24px, 2.5vw, 30px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.035em;
          margin-bottom: 6px;
        };
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.04em;
          margin-bottom: 8px;
        }

        .ordersStatText {
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        };
          font-size: 13px;
          line-height: 1.55;
          font-weight: 650;
        }

        .ordersNotice {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 14px 16px;
          border-radius: 12px;
          background: #f8f9fa;
          border: 1px solid #e3e6ea;
        };
          box-shadow: 0 12px 34px rgba(30,20,10,0.035);
        }

        .ordersNoticeIcon {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: #f7efe1;
          color: ${ui.goldDark};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
        }

        .ordersNoticeTitle {
          margin: 0;
          color: ${ui.text};
          font-size: 18px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .ordersNoticeText {
          margin: 6px 0 0;
          color: ${ui.muted};
          font-size: 13px;
          line-height: 1.65;
          font-weight: 650;
        }

        .ordersListPanel {
          padding: 20px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e3e6ea;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        };
          box-shadow: 0 14px 40px rgba(30,20,10,0.045);
        }

        .ordersListHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #eaecf0;
        }

        .ordersListTitle {
          margin: 0;
          color: #191a1d;
          font-size: 21px;
          line-height: 1.2;
          letter-spacing: -0.025em;
          font-weight: 800;
        };
          font-size: 26px;
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .ordersListSub {
          margin: 4px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 500;
        };
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
        }

        .ordersList {
          display: grid;
          gap: 12px;
        }

        .orderCard {
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
          display: grid;
          gap: 14px;
          box-shadow: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        };
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.08), transparent 36%),
            #fff;
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .orderCard.isCancelled {
          opacity: 0.88;
          background: #fcfcfc;
        }

        .orderTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .orderKicker {
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${ui.muted};
          margin-bottom: 7px;
        }

        .orderNumber {
          font-size: 24px;
          font-weight: 950;
          color: ${ui.text};
          line-height: 1.1;
          letter-spacing: -0.035em;
          word-break: break-word;
        }

        .orderSubline {
          margin-top: 7px;
          color: ${ui.muted};
          font-size: 13px;
          line-height: 1.55;
          font-weight: 650;
          word-break: break-word;
        }

        .orderBadges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .orderBadge {
          min-height: 32px;
          padding: 0 11px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .orderInfoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .orderInfoBox {
          border: 1px solid ${ui.line};
          border-radius: 18px;
          padding: 14px;
          background: #fbf8f2;
        }

        .orderInfoLabel {
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${ui.muted};
          margin-bottom: 7px;
        }

        .orderInfoValue {
          font-size: 14px;
          font-weight: 850;
          color: ${ui.text};
          line-height: 1.45;
          word-break: break-word;
        }

        .orderMetaGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .orderMetaBox {
          border-radius: 18px;
          background: #fff;
          border: 1px solid ${ui.line};
          padding: 14px;
        }

        .orderMetaLabel {
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: ${ui.muted};
          margin-bottom: 6px;
        }

        .orderMetaValue {
          font-size: 14px;
          line-height: 1.5;
          color: ${ui.text};
          font-weight: 760;
          word-break: break-word;
        }

        .orderItemsPreview {
          border: 1px solid ${ui.line};
          border-radius: 18px;
          background: rgba(255,255,255,0.72);
          overflow: hidden;
        }

        .orderItemRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(23,23,23,0.06);
        }

        .orderItemRow:last-child {
          border-bottom: 0;
        }

        .orderItemTitle {
          color: ${ui.text};
          font-size: 13px;
          line-height: 1.45;
          font-weight: 850;
          word-break: break-word;
        }

        .orderItemMeta {
          margin-top: 3px;
          color: ${ui.muted};
          font-size: 12px;
          line-height: 1.4;
          font-weight: 650;
        }

        .orderItemQty,
        .orderItemPrice {
          color: ${ui.text};
          font-size: 13px;
          font-weight: 850;
          white-space: nowrap;
        }

        .orderFooter {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
        }

        .orderNote {
          color: ${ui.muted};
          font-size: 13px;
          line-height: 1.6;
          font-weight: 650;
          max-width: 680px;
        }

        .orderActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .emptyOrders {
          padding: 48px 24px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.16), transparent 34%),
            #fff;
          border: 1px solid ${ui.line};
          box-shadow: 0 14px 40px rgba(30,20,10,0.045);
          text-align: center;
        }

        .emptyIcon {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          background: #f7efe1;
          color: ${ui.goldDark};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 950;
          margin-bottom: 18px;
        }

        .emptyTitle {
          margin: 0;
          color: ${ui.text};
          font-size: clamp(30px, 5vw, 44px);
          line-height: 1.05;
          letter-spacing: -0.055em;
          font-weight: 950;
        }

        .emptyText {
          margin: 12px auto 22px;
          max-width: 680px;
          color: ${ui.muted};
          font-size: 15px;
          line-height: 1.75;
          font-weight: 650;
        }

        @media (max-width: 1180px) {
          .ordersHero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          padding: 24px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #e3e6ea;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
        }

          .ordersHeroActions {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

          .ordersStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

          .orderInfoGrid,
          .orderMetaGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .ordersPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
        }

          .ordersHero,
          .ordersListPanel,
          .orderCard,
          .emptyOrders {
            border-radius: 22px;
            padding: 18px;
          }

          .ordersHeroActions,
          .orderActions {
            display: grid;
            width: 100%;
          }

          .ordersBtnPrimary,
          .ordersBtnSecondary {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 9px;
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
          text-decoration: none;
          font-size: 13px;
          line-height: 1;
          font-weight: 700;
          box-shadow: none;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

          .ordersStats,
          .orderInfoGrid,
          .orderMetaGrid {
            grid-template-columns: 1fr;
          }

          .ordersListHead,
          .orderFooter {
            display: grid;
          }

          .orderTop {
            display: grid;
          }

          .orderBadges {
            justify-content: flex-start;
          }

          .orderItemRow {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .orderItemQty,
          .orderItemPrice {
            white-space: normal;
          }
        }
        /* ORDERS PAGE CLEAN FIX */
        .ordersPage {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          display: grid !important;
          gap: 16px !important;
        }

        .ordersHero {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          gap: 24px !important;
          align-items: center !important;
          padding: 24px !important;
          border-radius: 14px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04) !important;
        }

        .ordersHero::before,
        .ordersHero::after {
          display: none !important;
          content: none !important;
        }

        .ordersKicker {
          margin-bottom: 9px !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: #a97d2f !important;
          font-size: 10px !important;
          line-height: 1.2 !important;
          font-weight: 850 !important;
          letter-spacing: 0.09em !important;
          text-transform: uppercase !important;
        }

        .ordersHeroTitle {
          max-width: 720px !important;
          margin: 0 !important;
          color: #17191c !important;
          font-size: clamp(26px, 3vw, 36px) !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          letter-spacing: -0.045em !important;
        }

        .ordersHeroCopy {
          max-width: 690px !important;
          margin: 10px 0 0 !important;
          color: #667085 !important;
          font-size: 13.5px !important;
          line-height: 1.6 !important;
          font-weight: 500 !important;
        }

        .ordersHeroActions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        .ordersBtnPrimary,
        .ordersBtnSecondary {
          min-height: 40px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 15px !important;
          border-radius: 9px !important;
          font-size: 12.5px !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          text-decoration: none !important;
          white-space: nowrap !important;
          box-shadow: none !important;
        }

        .ordersBtnPrimary {
          border: 1px solid #a97d2f !important;
          background: #a97d2f !important;
          color: #ffffff !important;
        }

        .ordersBtnSecondary {
          border: 1px solid #d0d5dd !important;
          background: #ffffff !important;
          color: #17191c !important;
        }

        .ordersStats {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        .ordersStat {
          min-width: 0 !important;
          padding: 16px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035) !important;
        }

        .ordersStatLabel {
          margin-bottom: 7px !important;
          color: #667085 !important;
          font-size: 9.5px !important;
          line-height: 1.2 !important;
          font-weight: 850 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .ordersStatValue {
          color: #17191c !important;
          font-size: 28px !important;
          line-height: 1.05 !important;
          font-weight: 900 !important;
          letter-spacing: -0.04em !important;
        }

        .ordersStatText {
          margin-top: 7px !important;
          color: #667085 !important;
          font-size: 11.5px !important;
          line-height: 1.45 !important;
          font-weight: 500 !important;
        }

        .ordersNotice {
          display: grid !important;
          grid-template-columns: 32px minmax(0, 1fr) !important;
          gap: 12px !important;
          align-items: start !important;
          padding: 14px 16px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035) !important;
        }

        .ordersNoticeIcon {
          width: 32px !important;
          height: 32px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 9px !important;
          border: 1px solid #e2d7c3 !important;
          background: #f8f2e7 !important;
          color: #a97d2f !important;
          font-size: 13px !important;
          font-weight: 900 !important;
        }

        .ordersNoticeTitle {
          margin: 0 !important;
          color: #17191c !important;
          font-size: 14px !important;
          line-height: 1.35 !important;
          font-weight: 900 !important;
          letter-spacing: -0.015em !important;
        }

        .ordersNoticeText {
          margin: 4px 0 0 !important;
          color: #667085 !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
          font-weight: 500 !important;
        }

        .ordersListPanel {
          overflow: hidden !important;
          padding: 0 !important;
          border-radius: 14px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04) !important;
        }

        .ordersListHead {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 16px !important;
          padding: 18px !important;
          margin: 0 !important;
          border-bottom: 1px solid #eaecf0 !important;
        }

        .ordersListTitle {
          margin: 0 !important;
          color: #17191c !important;
          font-size: 21px !important;
          line-height: 1.2 !important;
          font-weight: 900 !important;
          letter-spacing: -0.035em !important;
        }

        .ordersListSub {
          margin: 5px 0 0 !important;
          color: #667085 !important;
          font-size: 12.5px !important;
          line-height: 1.5 !important;
          font-weight: 500 !important;
        }

        .ordersList {
          display: grid !important;
          gap: 0 !important;
        }

        .orderCard {
          border: 0 !important;
          border-bottom: 1px solid #f0f2f4 !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
          padding: 18px !important;
        }

        .orderCard:last-child {
          border-bottom: 0 !important;
        }

        .orderTop {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 16px !important;
        }

        .orderKicker {
          color: #667085 !important;
          font-size: 9px !important;
          line-height: 1.2 !important;
          font-weight: 850 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .orderNumber {
          margin-top: 3px !important;
          color: #17191c !important;
          font-size: 15px !important;
          line-height: 1.25 !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
        }

        .orderSubline {
          margin-top: 3px !important;
          color: #667085 !important;
          font-size: 12px !important;
          line-height: 1.35 !important;
          font-weight: 500 !important;
        }

        .orderInfoGrid,
        .orderMetaGrid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .orderInfoBox,
        .orderMetaBox {
          padding: 12px !important;
          border-radius: 10px !important;
          border: 1px solid #eaecf0 !important;
          background: #f8fafc !important;
        }

        .orderInfoLabel,
        .orderMetaLabel {
          color: #667085 !important;
          font-size: 9px !important;
          line-height: 1.2 !important;
          font-weight: 850 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .orderInfoValue,
        .orderMetaValue {
          margin-top: 4px !important;
          color: #17191c !important;
          font-size: 12.5px !important;
          line-height: 1.35 !important;
          font-weight: 800 !important;
        }

        .orderFooter {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 16px !important;
          padding-top: 14px !important;
          border-top: 1px solid #f0f2f4 !important;
        }

        .orderNote {
          color: #667085 !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
          font-weight: 500 !important;
        }

        .orderActions {
          display: flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 10px !important;
          flex-wrap: wrap !important;
        }

        @media (max-width: 1180px) {
          .ordersStats,
          .orderInfoGrid,
          .orderMetaGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .ordersHero {
            grid-template-columns: 1fr !important;
          }

          .ordersHeroActions {
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 760px) {
          .ordersStats,
          .orderInfoGrid,
          .orderMetaGrid {
            grid-template-columns: 1fr !important;
          }

          .ordersListHead,
          .orderTop,
          .orderFooter {
            display: grid !important;
          }

          .ordersBtnPrimary,
          .ordersBtnSecondary {
            width: 100% !important;
          }
        }
        /* ORDERS COMPACT FINAL */
        .ordersPage {
          max-width: none !important;
          width: 100% !important;
          gap: 14px !important;
        }

        .ordersHero {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          align-items: center !important;
          gap: 20px !important;
          padding: 22px !important;
          border-radius: 14px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(16,24,40,0.04) !important;
        }

        .ordersHeroTitle {
          max-width: 760px !important;
          font-size: clamp(25px, 2.8vw, 34px) !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          letter-spacing: -0.045em !important;
        }

        .ordersHeroCopy {
          max-width: 720px !important;
          font-size: 13px !important;
          line-height: 1.55 !important;
          color: #667085 !important;
        }

        .ordersStats {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .ordersStat {
          padding: 15px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(16,24,40,0.035) !important;
        }

        .ordersStatLabel {
          font-size: 9.5px !important;
          font-weight: 850 !important;
          letter-spacing: 0.08em !important;
          color: #667085 !important;
          text-transform: uppercase !important;
        }

        .ordersStatValue {
          font-size: 27px !important;
          line-height: 1.05 !important;
          font-weight: 900 !important;
          color: #17191c !important;
        }

        .ordersNotice {
          display: none !important;
        }

        .ordersListPanel {
          padding: 0 !important;
          overflow: hidden !important;
          border-radius: 14px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(16,24,40,0.04) !important;
        }

        .ordersListHead {
          padding: 18px !important;
          margin: 0 !important;
          border-bottom: 1px solid #eaecf0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        .ordersList {
          display: grid !important;
          gap: 0 !important;
        }

        .orderCard {
          display: grid !important;
          grid-template-columns: minmax(190px, 1.3fr) minmax(420px, 2fr) auto !important;
          align-items: center !important;
          gap: 18px !important;
          padding: 16px 18px !important;
          border: 0 !important;
          border-bottom: 1px solid #f0f2f4 !important;
          border-radius: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }

        .orderCard:last-child {
          border-bottom: 0 !important;
        }

        .orderTop {
          display: grid !important;
          gap: 6px !important;
        }

        .orderBadges {
          display: flex !important;
          gap: 6px !important;
          flex-wrap: wrap !important;
        }

        .orderInfoGrid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }

        .orderMetaGrid,
        .orderItemsPreview,
        .orderNote {
          display: none !important;
        }

        .orderInfoBox {
          padding: 10px !important;
          border-radius: 9px !important;
          border: 1px solid #eaecf0 !important;
          background: #f8fafc !important;
        }

        .orderFooter {
          display: flex !important;
          justify-content: flex-end !important;
          padding: 0 !important;
          border: 0 !important;
        }

        .orderActions {
          display: flex !important;
          gap: 8px !important;
          justify-content: flex-end !important;
        }

        @media (max-width: 1250px) {
          .orderCard {
            grid-template-columns: 1fr !important;
            align-items: start !important;
          }

          .orderInfoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .ordersStats,
          .orderInfoGrid {
            grid-template-columns: 1fr !important;
          }

          .ordersHero,
          .ordersListHead {
            grid-template-columns: 1fr !important;
            display: grid !important;
          }
        }
        /* ORDERS POLISH FINAL */
        .ordersPage {
          gap: 14px !important;
        }

        .ordersHero {
          padding: 20px 22px !important;
          min-height: auto !important;
        }

        .ordersHeroTitle {
          font-size: clamp(24px, 2.5vw, 32px) !important;
          max-width: 680px !important;
        }

        .ordersHeroCopy {
          max-width: 660px !important;
          margin-top: 8px !important;
        }

        .ordersStats {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .ordersStat {
          padding: 14px !important;
        }

        .ordersStatValue {
          font-size: 25px !important;
        }

        .ordersListPanel {
          margin-top: 0 !important;
        }

        .orderCard {
          grid-template-columns: 300px minmax(0, 1fr) 210px !important;
          gap: 18px !important;
          padding: 14px 18px !important;
          min-height: 102px !important;
        }

        .orderNumber {
          font-size: 14.5px !important;
        }

        .orderSubline {
          font-size: 11.5px !important;
        }

        .orderBadges {
          margin-top: 6px !important;
        }

        .orderInfoGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 8px !important;
        }

        .orderInfoBox {
          padding: 9px 10px !important;
        }

        .orderInfoLabel {
          font-size: 8.5px !important;
        }

        .orderInfoValue {
          font-size: 12px !important;
        }

        .orderActions {
          align-items: center !important;
        }

        .orderActions a,
        .orderActions button {
          min-height: 38px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 800 !important;
        }

        @media (max-width: 1300px) {
          .orderCard {
            grid-template-columns: 1fr !important;
            align-items: start !important;
          }

          .orderInfoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .orderActions {
            justify-content: flex-start !important;
          }
        }

        @media (max-width: 760px) {
          .ordersStats,
          .orderInfoGrid {
            grid-template-columns: 1fr !important;
          }
        }



      `}</style>

      <div className="ordersPage">
        <section className="ordersHero">
          <div className="ordersHeroTextWrap">
            <div className="ordersKicker">
              {locale === "en" ? "Order history" : "Bestellübersicht"}
            </div>

            <h1 className="ordersHeroTitle">
              {locale === "en"
                ? "Manage company orders and delivery details."
                : "Firmenbestellungen und Lieferdetails verwalten."}
            </h1>

            <p className="ordersHeroCopy">
              {locale === "en"
                ? "Review order status, delivery dates, cost centers and order details in one central overview."
                : "Prüfe Bestellstatus, Liefertermine, Kostenstellen und Bestelldetails in einer zentralen Übersicht."}
            </p>
          </div>

          <div className="ordersHeroActions">
            <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersBtnPrimary">
              {locale === "en" ? "Start new order" : "Neue Bestellung starten"}
            </a>

            <a href={withLang("/dashboard", locale)} className="ordersBtnSecondary">
              {locale === "en" ? "Back to dashboard" : "Zurück zum Dashboard"}
            </a>
          </div>
        </section>

        <section className="ordersStats">
          <StatCard
            label={locale === "en" ? "Orders total" : "Bestellungen gesamt"}
            value={orders.length}
            text={
              locale === "en"
                ? "All linked company orders."
                : "Alle verknüpften Firmenbestellungen."
            }
          />

          <StatCard
            label={locale === "en" ? "Active" : "Aktiv"}
            value={openCount}
            text={
              locale === "en"
                ? "Open, confirmed or in preparation."
                : "Offen, bestätigt oder in Vorbereitung."
            }
          />

          <StatCard
            label={locale === "en" ? "Delivered" : "Geliefert"}
            value={deliveredCount}
            text={
              locale === "en"
                ? "Successfully completed orders."
                : "Erfolgreich abgeschlossene Bestellungen."
            }
          />

          <StatCard
            label={locale === "en" ? "Total value" : "Gesamtwert"}
            value={formatMoney(totalAmount, "EUR", locale)}
            text={
              locale === "en"
                ? "Sum of all linked orders."
                : "Summe aller verknüpften Bestellungen."
            }
          />
        </section>

        {orders.length > 0 ? (
          <section className="ordersNotice">
            <div className="ordersNoticeIcon">i</div>
            <div>
              <h3 className="ordersNoticeTitle">
                {locale === "en"
                  ? "Order information is available in your company account."
                  : "Bestellinformationen sind in deinem Firmenkonto verfügbar."}
              </h3>
              <p className="ordersNoticeText">
                {locale === "en"
                  ? `Last order: ${lastOrder?.orderNumber || "—"}. You can open details, review items and reorder when Shopify variant IDs are stored.`
                  : `Letzte Bestellung: ${lastOrder?.orderNumber || "—"}. Du kannst Details öffnen, Positionen prüfen und erneut bestellen, wenn Shopify-Variant-IDs gespeichert wurden.`}
              </p>
            </div>
          </section>
        ) : null}

        {orders.length === 0 ? (
          <EmptyOrders locale={locale} />
        ) : (
          <section className="ordersListPanel">
            <div className="ordersListHead">
              <div>
                <h2 className="ordersListTitle">
                  {locale === "en" ? "Your orders" : "Deine Bestellungen"}
                </h2>

                <p className="ordersListSub">
                  {locale === "en"
                    ? "Sorted by latest order first."
                    : "Sortiert nach der neuesten Bestellung zuerst."}
                </p>
              </div>

              <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersBtnSecondary">
                {locale === "en" ? "Order again" : "Wieder bestellen"}
              </a>
            </div>

            <div className="ordersList">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  );
}

function StatCard({ label, value, text }) {
  return (
    <div className="ordersStat">
      <div className="ordersStatLabel">{label}</div>
      <div className="ordersStatValue">{value}</div>
      <div className="ordersStatText">{text}</div>
    </div>
  );
}

function EmptyOrders({ locale }) {
  return (
    <section className="emptyOrders">
      <div className="emptyIcon">+</div>

      <h3 className="emptyTitle">
        {locale === "en" ? "No orders yet" : "Noch keine Bestellungen"}
      </h3>

      <p className="emptyText">
        {locale === "en"
          ? "As soon as invoice-purchase or portal orders are linked to your account, they will appear here with status, items and amount."
          : "Sobald Rechnungskauf- oder Portal-Bestellungen mit deinem Konto verknüpft sind, erscheinen sie hier mit Status, Positionen und Betrag."}
      </p>

      <a href="https://letmebowl-catering.de/pages/bestellen" className="ordersBtnPrimary">
        {locale === "en" ? "Start first order" : "Erste Bestellung starten"}
      </a>
    </section>
  );
}

function OrderCard({ order, locale }) {
  const statusLabel = getStatusLabel(order.status, locale);
  const statusStyle = getStatusStyle(order.status);

  const items = order.items || [];
  const visibleItems = items.slice(0, 4);
  const moreItemsCount = Math.max(0, items.length - visibleItems.length);

  const reorderableItems = items.filter(
    (item) => item.shopifyVariantId && Number(item.quantity || 0) > 0
  );

  const hasReorderableItems = reorderableItems.length > 0;
  const reorderUrl = hasReorderableItems
    ? buildShopifyCartPermalink(reorderableItems)
    : null;

  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  return (
    <article className={`orderCard ${isCancelled ? "isCancelled" : ""}`}>
      <div className="orderTop">
        <div>
          <div className="orderKicker">
            {locale === "en" ? "Order" : "Bestellung"}
          </div>

          <div className="orderNumber">{order.orderNumber}</div>

          <div className="orderSubline">
            {order.billingCompanyName ||
              order.deliveryAddress?.label ||
              (locale === "en" ? "Company order" : "Firmenbestellung")}
          </div>
        </div>

        <div className="orderBadges">
          <span className="orderBadge" style={statusStyle}>
            {statusLabel}
          </span>

          {hasReorderableItems ? (
            <span className="orderBadge" style={okBadgeStyle}>
              {locale === "en" ? "Reorder possible" : "Reorder möglich"}
            </span>
          ) : (
            <span className="orderBadge" style={mutedBadgeStyle}>
              {locale === "en" ? "No reorder" : "Kein Reorder"}
            </span>
          )}
        </div>
      </div>

      <div className="orderInfoGrid">
        <InfoBox
          label={locale === "en" ? "Created" : "Erstellt"}
          value={formatDate(order.createdAt, locale)}
        />

        <InfoBox
          label={locale === "en" ? "Delivery date" : "Lieferdatum"}
          value={order.deliveryDate ? formatDate(order.deliveryDate, locale) : "—"}
        />

        <InfoBox
          label={locale === "en" ? "Amount" : "Betrag"}
          value={formatMoney(order.totalAmount, order.currency || "EUR", locale)}
        />

        <InfoBox
          label={locale === "en" ? "Items" : "Positionen"}
          value={String(items.length || 0)}
        />
      </div>

      {(order.costCenter?.name || order.deliveryAddress?.label || order.referenceNumber) ? (
        <div className="orderMetaGrid">
          {order.costCenter?.name ? (
            <MetaBox
              label={locale === "en" ? "Cost center" : "Kostenstelle"}
              value={
                order.costCenter.code
                  ? `${order.costCenter.name} · ${order.costCenter.code}`
                  : order.costCenter.name
              }
            />
          ) : null}

          {order.deliveryAddress?.label ? (
            <MetaBox
              label={locale === "en" ? "Delivery address" : "Lieferadresse"}
              value={order.deliveryAddress.label}
            />
          ) : null}

          {order.referenceNumber ? (
            <MetaBox
              label={locale === "en" ? "Reference" : "Referenz"}
              value={order.referenceNumber}
            />
          ) : null}
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="orderItemsPreview">
          {visibleItems.map((item) => (
            <div className="orderItemRow" key={item.id}>
              <div>
                <div className="orderItemTitle">{item.title}</div>
                <div className="orderItemMeta">
                  {[
                    item.variantTitle,
                    item.sku ? `SKU: ${item.sku}` : "",
                    item.notes,
                  ]
                    .filter(Boolean)
                    .join(" · ") || (locale === "en" ? "Item" : "Position")}
                </div>
              </div>

              <div className="orderItemQty">
                {locale === "en" ? "Qty" : "Menge"}: {item.quantity || 1}
              </div>

              <div className="orderItemPrice">
                {formatMoney(item.totalPrice || 0, order.currency || "EUR", locale)}
              </div>
            </div>
          ))}

          {moreItemsCount > 0 ? (
            <div className="orderItemRow">
              <div className="orderItemTitle">
                {locale === "en"
                  ? `+ ${moreItemsCount} more items`
                  : `+ ${moreItemsCount} weitere Positionen`}
              </div>
              <div></div>
              <div></div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="orderFooter">
        <div className="orderNote">
          {isCancelled
            ? locale === "en"
              ? "This order was cancelled."
              : "Diese Bestellung wurde storniert."
            : isDelivered
            ? locale === "en"
              ? "This order has already been delivered."
              : "Diese Bestellung wurde bereits geliefert."
            : locale === "en"
            ? "Open details to review all order data and items."
            : "Öffne die Details, um alle Bestelldaten und Positionen zu prüfen."}
        </div>

        <div className="orderActions">
          <a
            href={withLang(`/bestellungen/${order.id}`, locale)}
            className="ordersBtnSecondary"
          >
            {locale === "en" ? "Details" : "Details"}
          </a>

          {hasReorderableItems ? (
            <a href={reorderUrl} className="ordersBtnPrimary">
              {locale === "en" ? "Reorder" : "Erneut bestellen"}
            </a>
          ) : (
            <span
              className="ordersBtnPrimary"
              style={{
                background: "#c9c1b0",
                cursor: "not-allowed",
                opacity: 0.82,
              }}
            >
              {locale === "en" ? "Reorder" : "Erneut bestellen"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="orderInfoBox">
      <div className="orderInfoLabel">{label}</div>
      <div className="orderInfoValue">{value || "—"}</div>
    </div>
  );
}

function MetaBox({ label, value }) {
  return (
    <div className="orderMetaBox">
      <div className="orderMetaLabel">{label}</div>
      <div className="orderMetaValue">{value || "—"}</div>
    </div>
  );
}

function buildShopifyCartPermalink(items) {
  const lineItems = items
    .filter((item) => item.shopifyVariantId && Number(item.quantity || 0) > 0)
    .map((item) => {
      const variantId = encodeURIComponent(String(item.shopifyVariantId));
      const qty = Math.max(1, Number(item.quantity || 1));
      return `${variantId}:${qty}`;
    });

  return `https://letmebowl-catering.de/cart/${lineItems.join(",")}`;
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

function formatMoney(value, currency = "EUR", locale) {
  const num = Number(value || 0);

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

const okBadgeStyle = {
  background: "#edf7ee",
  color: "#1f6b36",
  border: "1px solid #cfe8d4",
};

const mutedBadgeStyle = {
  background: "#f3f3f3",
  color: "#666",
  border: "1px solid #dfdfdf",
};