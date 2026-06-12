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

        /* LMB LUXURY DASHBOARD V2 */

        .dashboardPage {
          --luxury-ivory: #f6f2ea;
          --luxury-paper: #fffdf9;
          --luxury-paper-soft: #faf6ef;
          --luxury-espresso: #201b16;
          --luxury-brown: #5e5245;
          --luxury-muted: #817465;
          --luxury-champagne: #cbb078;
          --luxury-gold: #b89252;
          --luxury-gold-dark: #87652f;
          --luxury-line: rgba(91, 72, 45, 0.13);
          --luxury-line-strong: rgba(145, 108, 54, 0.21);
          --luxury-shadow:
            0 22px 55px rgba(54, 42, 25, 0.075),
            0 4px 14px rgba(54, 42, 25, 0.035);

          gap: 20px;
          padding-bottom: 46px;
        }

        .dashboardPage::before {
          top: -180px;
          right: -190px;
          width: 520px;
          height: 520px;
          background:
            radial-gradient(
              circle,
              rgba(203, 176, 120, 0.14) 0%,
              rgba(203, 176, 120, 0.045) 42%,
              transparent 72%
            );
        }

        .dashboardHero {
          min-height: 350px;
          padding: 46px;
          border-radius: 32px;
          border: 1px solid var(--luxury-line-strong);
          background:
            radial-gradient(
              circle at 2% 0%,
              rgba(223, 204, 167, 0.3),
              transparent 34%
            ),
            radial-gradient(
              circle at 98% 100%,
              rgba(178, 143, 82, 0.09),
              transparent 37%
            ),
            linear-gradient(
              138deg,
              #fffefb 0%,
              #fbf8f2 47%,
              #f3ebdd 100%
            );
          box-shadow:
            0 30px 80px rgba(55, 43, 26, 0.095),
            0 5px 18px rgba(55, 43, 26, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .dashboardHero::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            linear-gradient(
              110deg,
              transparent 0%,
              rgba(255, 255, 255, 0.2) 48%,
              transparent 70%
            );
          pointer-events: none;
        }

        .dashboardHero::after {
          top: -115px;
          right: -90px;
          width: 340px;
          height: 340px;
          border-color: rgba(184, 146, 82, 0.11);
          box-shadow:
            0 0 0 42px rgba(184, 146, 82, 0.025),
            0 0 0 88px rgba(184, 146, 82, 0.012);
        }

        .dashboardHeroInner {
          grid-template-columns: minmax(0, 1.25fr) minmax(315px, 0.64fr);
          gap: 46px;
        }

        .dashboardEyebrow {
          min-height: 36px;
          padding: 0 15px;
          margin-bottom: 21px;
          border: 1px solid rgba(173, 133, 67, 0.24);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.9),
              rgba(205, 174, 113, 0.12)
            );
          color: var(--luxury-gold-dark);
          font-size: 11px;
          letter-spacing: 0.15em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            0 8px 20px rgba(96, 72, 38, 0.055);
        }

        .dashboardHeroTitle {
          max-width: 720px;
          color: var(--luxury-espresso);
          font-size: clamp(46px, 5.35vw, 68px);
          line-height: 0.94;
          letter-spacing: -0.066em;
          font-weight: 950;
          text-wrap: balance;
        }

        .dashboardHeroText {
          max-width: 690px;
          margin-top: 22px;
          color: var(--luxury-brown);
          font-size: 16px;
          line-height: 1.78;
          font-weight: 570;
        }

        .dashboardHeroActions {
          margin-top: 31px;
          gap: 12px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          min-height: 55px;
          padding: 0 24px;
          border-radius: 14px;
          font-weight: 880;
          letter-spacing: -0.015em;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a77c3c;
          background:
            linear-gradient(
              145deg,
              #d8bf88 0%,
              #c19c5b 52%,
              #a77837 100%
            );
          color: #fffdf8;
          box-shadow:
            0 15px 30px rgba(129, 93, 43, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.36);
        }

        .dashboardSecondaryBtn {
          border: 1px solid rgba(66, 52, 34, 0.13);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.94),
              rgba(250, 246, 238, 0.9)
            );
          color: var(--luxury-espresso);
          box-shadow:
            0 10px 24px rgba(50, 39, 24, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(14px);
        }

        .dashboardPrimaryBtn:hover,
        .dashboardSecondaryBtn:hover {
          transform: translateY(-2px);
        }

        .dashboardPrimaryBtn:hover {
          background:
            linear-gradient(
              145deg,
              #dfc995 0%,
              #c9a462 52%,
              #ae7d3a 100%
            );
          box-shadow:
            0 20px 38px rgba(129, 93, 43, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.42);
        }

        .dashboardSecondaryBtn:hover {
          border-color: rgba(169, 128, 64, 0.31);
          box-shadow:
            0 15px 30px rgba(50, 39, 24, 0.085),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .dashboardHeroBox {
          padding: 29px;
          border-radius: 22px;
          border: 1px solid rgba(145, 108, 54, 0.18);
          background:
            radial-gradient(
              circle at top right,
              rgba(204, 174, 116, 0.16),
              transparent 42%
            ),
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.91),
              rgba(251, 247, 239, 0.86)
            );
          box-shadow:
            0 18px 42px rgba(50, 38, 22, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(18px);
        }

        .dashboardHeroBox::after {
          content: "";
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 0;
          height: 2px;
          border-radius: 999px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(187, 148, 80, 0.65),
              transparent
            );
        }

        .dashboardHeroBox strong,
        .dashboardHeroBox h2,
        .dashboardHeroBox h3 {
          color: var(--luxury-espresso);
        }

        .dashboardStats {
          gap: 14px;
        }

        .dashboardStat {
          min-height: 134px;
          padding: 23px 21px;
          border-radius: 21px;
          border: 1px solid var(--luxury-line);
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(214, 190, 143, 0.12),
              transparent 42%
            ),
            linear-gradient(
              145deg,
              #fffefb 0%,
              #faf6ef 100%
            );
          box-shadow:
            0 14px 34px rgba(52, 40, 23, 0.055),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .dashboardStat::before {
          content: "";
          position: absolute;
          top: 0;
          left: 20px;
          right: 20px;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(189, 151, 85, 0.38),
              transparent
            );
        }

        .dashboardStat::after {
          right: -38px;
          bottom: -48px;
          width: 125px;
          height: 125px;
          background:
            radial-gradient(
              circle,
              rgba(202, 171, 112, 0.11),
              transparent 68%
            );
        }

        .dashboardStat:hover {
          transform: translateY(-3px);
          border-color: rgba(171, 130, 66, 0.26);
          box-shadow:
            0 21px 45px rgba(52, 40, 23, 0.085),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .dashboardStatLabel {
          color: var(--luxury-gold-dark);
          font-size: 10px;
          letter-spacing: 0.14em;
        }

        .dashboardStatValue {
          color: var(--luxury-espresso);
          font-size: clamp(30px, 3vw, 39px);
          letter-spacing: -0.055em;
        }

        .dashboardStatText {
          color: var(--luxury-muted);
          line-height: 1.55;
        }

        .dashboardQuickGrid {
          gap: 15px;
        }

        .dashboardQuickCard {
          min-height: 166px;
          padding: 24px;
          border-radius: 22px;
          border: 1px solid var(--luxury-line);
          background:
            radial-gradient(
              circle at top right,
              rgba(214, 190, 143, 0.1),
              transparent 40%
            ),
            linear-gradient(
              150deg,
              #fffefb 0%,
              #faf7f1 100%
            );
          box-shadow:
            0 14px 34px rgba(52, 40, 23, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          transition:
            transform 190ms ease,
            border-color 190ms ease,
            box-shadow 190ms ease;
        }

        .dashboardQuickCard:hover {
          transform: translateY(-4px);
          border-color: rgba(171, 130, 66, 0.27);
          box-shadow:
            0 22px 48px rgba(52, 40, 23, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .dashboardQuickIcon {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          border: 1px solid rgba(171, 130, 66, 0.21);
          background:
            linear-gradient(
              145deg,
              #fffefa,
              rgba(205, 174, 113, 0.16)
            );
          color: var(--luxury-gold-dark);
          box-shadow:
            0 9px 20px rgba(102, 76, 38, 0.075),
            inset 0 1px 0 rgba(255, 255, 255, 0.97);
        }

        .dashboardQuickTitle {
          color: var(--luxury-espresso);
          letter-spacing: -0.03em;
        }

        .dashboardQuickText {
          color: var(--luxury-muted);
          line-height: 1.6;
        }

        .ordersCard {
          border-radius: 26px;
          border: 1px solid var(--luxury-line);
          background:
            linear-gradient(
              150deg,
              rgba(255, 254, 251, 0.98),
              rgba(250, 247, 241, 0.96)
            );
          box-shadow:
            0 17px 42px rgba(52, 40, 23, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
        }

        .orderRow {
          border-radius: 17px;
          border: 1px solid rgba(87, 67, 42, 0.1);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.94),
              rgba(251, 248, 242, 0.91)
            );
          box-shadow:
            0 8px 20px rgba(46, 35, 21, 0.035),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .orderRow:hover {
          transform: translateY(-2px);
          border-color: rgba(171, 130, 66, 0.24);
          box-shadow:
            0 15px 31px rgba(46, 35, 21, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .dashboardPage h2,
        .dashboardPage h3,
        .dashboardPage strong {
          color: var(--luxury-espresso);
        }

        .dashboardPage p {
          color: var(--luxury-muted);
        }

        @media (max-width: 900px) {
          .dashboardHero {
            min-height: 0;
            padding: 32px;
          }

          .dashboardHeroInner {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .dashboardHeroBox {
            width: 100%;
          }
        }

        @media (max-width: 720px) {
          .dashboardPage {
            gap: 15px;
          }

          .dashboardHero {
            padding: 26px 21px;
            border-radius: 24px;
          }

          .dashboardHeroTitle {
            font-size: 40px;
          }

          .dashboardHeroText {
            font-size: 14.5px;
          }

          .dashboardHeroActions {
            display: grid;
          }

          .dashboardPrimaryBtn,
          .dashboardSecondaryBtn {
            width: 100%;
          }

          .dashboardStat,
          .dashboardQuickCard {
            border-radius: 19px;
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