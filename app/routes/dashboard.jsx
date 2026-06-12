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

        /* LMB PREMIUM DASHBOARD FINAL */

        .dashboardPage {
          position: relative;
          gap: 22px;
          padding-bottom: 42px;
        }

        .dashboardPage::before {
          content: "";
          position: absolute;
          top: -130px;
          right: -160px;
          width: 460px;
          height: 460px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(198, 159, 87, 0.16) 0%,
              rgba(198, 159, 87, 0.05) 42%,
              transparent 72%
            );
          pointer-events: none;
        }

        .dashboardPage > * {
          position: relative;
          z-index: 1;
        }

        .dashboardHero {
          isolation: isolate;
          min-height: 340px;
          padding: 44px;
          border-radius: 36px;
          border: 1px solid rgba(170, 128, 57, 0.18);
          background:
            radial-gradient(
              circle at 7% 0%,
              rgba(217, 185, 119, 0.26),
              transparent 34%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(156, 111, 42, 0.11),
              transparent 37%
            ),
            linear-gradient(
              135deg,
              #ffffff 0%,
              #fdfaf4 53%,
              #f3e8d5 100%
            );
          box-shadow:
            0 32px 80px rgba(55, 38, 15, 0.11),
            0 5px 16px rgba(55, 38, 15, 0.04);
        }

        .dashboardHero::after {
          content: "";
          position: absolute;
          z-index: -1;
          top: -105px;
          right: -85px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          border: 1px solid rgba(181, 140, 72, 0.12);
          box-shadow:
            0 0 0 38px rgba(181, 140, 72, 0.035),
            0 0 0 82px rgba(181, 140, 72, 0.018);
          pointer-events: none;
        }

        .dashboardHeroInner {
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.68fr);
          gap: 42px;
        }

        .dashboardEyebrow {
          min-height: 35px;
          padding: 0 15px;
          margin-bottom: 19px;
          border-color: rgba(178, 137, 67, 0.25);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.94),
              rgba(198, 159, 87, 0.12)
            );
          color: #98712e;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.96),
            0 8px 20px rgba(120, 84, 29, 0.07);
        }

        .dashboardHeroTitle {
          max-width: 720px;
          font-size: clamp(44px, 5.3vw, 66px);
          line-height: 0.95;
          letter-spacing: -0.065em;
          text-wrap: balance;
        }

        .dashboardHeroText {
          max-width: 720px;
          margin-top: 21px;
          font-size: 16px;
          line-height: 1.75;
        }

        .dashboardHeroActions {
          gap: 12px;
          margin-top: 29px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          min-height: 54px;
          padding: 0 23px;
          border-radius: 16px;
          font-weight: 900;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .dashboardPrimaryBtn {
          border-color: #b3873c;
          background:
            linear-gradient(
              145deg,
              #d9ba76 0%,
              #c49a4e 56%,
              #aa7b31 100%
            );
          color: #ffffff;
          box-shadow:
            0 16px 32px rgba(158, 113, 43, 0.27),
            inset 0 1px 0 rgba(255, 255, 255, 0.42);
        }

        .dashboardSecondaryBtn {
          border-color: rgba(52, 38, 18, 0.13);
          background: rgba(255, 255, 255, 0.9);
          box-shadow:
            0 12px 27px rgba(41, 29, 13, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
        }

        .dashboardPrimaryBtn:hover,
        .dashboardSecondaryBtn:hover {
          transform: translateY(-3px);
        }

        .dashboardPrimaryBtn:hover {
          box-shadow:
            0 22px 42px rgba(158, 113, 43, 0.33),
            inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }

        .dashboardSecondaryBtn:hover {
          border-color: rgba(184, 147, 79, 0.38);
          box-shadow: 0 17px 35px rgba(41, 29, 13, 0.11);
        }

        .dashboardHeroBox {
          position: relative;
          overflow: hidden;
          padding: 28px;
          border-radius: 26px;
          border: 1px solid rgba(159, 117, 49, 0.17);
          background:
            radial-gradient(
              circle at top right,
              rgba(205, 169, 101, 0.17),
              transparent 44%
            ),
            rgba(255, 255, 255, 0.84);
          box-shadow:
            0 19px 44px rgba(47, 32, 12, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(16px);
        }

        .dashboardStats {
          gap: 14px;
        }

        .dashboardStat {
          position: relative;
          overflow: hidden;
          min-height: 132px;
          padding: 23px 21px;
          border-radius: 24px;
          border-color: rgba(91, 66, 29, 0.12);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.99),
              rgba(249, 245, 236, 0.97)
            );
          box-shadow:
            0 16px 38px rgba(49, 34, 15, 0.065),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .dashboardStat::after {
          content: "";
          position: absolute;
          right: -30px;
          bottom: -40px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(196, 156, 82, 0.13),
              transparent 69%
            );
          pointer-events: none;
        }

        .dashboardStat:hover {
          transform: translateY(-4px);
          border-color: rgba(184, 147, 79, 0.3);
          box-shadow:
            0 24px 52px rgba(49, 34, 15, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.99);
        }

        .dashboardStatValue {
          font-size: clamp(30px, 3vw, 38px);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .dashboardQuickGrid {
          gap: 15px;
        }

        .dashboardQuickCard {
          min-height: 165px;
          padding: 24px;
          border-radius: 25px;
          border-color: rgba(91, 66, 29, 0.12);
          background:
            linear-gradient(
              150deg,
              rgba(255, 255, 255, 0.99),
              rgba(249, 246, 239, 0.96)
            );
          box-shadow:
            0 16px 37px rgba(49, 34, 15, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          transition:
            transform 190ms ease,
            border-color 190ms ease,
            box-shadow 190ms ease;
        }

        .dashboardQuickCard:hover {
          transform: translateY(-4px);
          border-color: rgba(184, 147, 79, 0.3);
          box-shadow:
            0 24px 52px rgba(49, 34, 15, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.99);
        }

        .dashboardQuickIcon {
          width: 45px;
          height: 45px;
          border-radius: 15px;
          border-color: rgba(184, 147, 79, 0.24);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.98),
              rgba(201, 164, 95, 0.17)
            );
          box-shadow:
            0 10px 22px rgba(119, 84, 31, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.97);
        }

        .ordersCard {
          border-radius: 30px;
          border-color: rgba(91, 66, 29, 0.12);
          box-shadow:
            0 18px 46px rgba(49, 34, 15, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
        }

        .orderRow {
          border-radius: 19px;
          border-color: rgba(70, 52, 27, 0.1);
          background: rgba(255, 255, 255, 0.9);
          box-shadow:
            0 10px 24px rgba(45, 31, 13, 0.045),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .orderRow:hover {
          transform: translateY(-3px);
          border-color: rgba(184, 147, 79, 0.28);
          box-shadow: 0 17px 34px rgba(45, 31, 13, 0.085);
        }

        @media (max-width: 900px) {
          .dashboardHero {
            min-height: 0;
            padding: 30px;
          }

          .dashboardHeroInner {
            grid-template-columns: 1fr;
            gap: 26px;
          }
        }

        @media (max-width: 720px) {
          .dashboardHero {
            padding: 25px 20px;
            border-radius: 26px;
          }

          .dashboardHeroTitle {
            font-size: 39px;
          }

          .dashboardHeroActions {
            display: grid;
          }

          .dashboardPrimaryBtn,
          .dashboardSecondaryBtn {
            width: 100%;
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