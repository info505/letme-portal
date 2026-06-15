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
          max-width: 1280px;
          display: grid;
          gap: 18px;
        }

        .dashboardHero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
        };
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.16), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #faf6ee 100%);
          box-shadow: 0 22px 60px rgba(30,20,10,0.065);
          padding: 34px;
        }

        .dashboardHeroInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .dashboardEyebrow {
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
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        };
          font-size: clamp(34px, 5vw, 56px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          font-weight: 950;
        }

        .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 760px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        };
          font-size: 16px;
          line-height: 1.7;
          font-weight: 600;
        }

        .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #fff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }, ${colors.goldDark});
          color: #fff;
          box-shadow: 0 16px 30px rgba(200,169,106,0.24);
        }

        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        };
          background: #fff;
          color: ${colors.text};
        }

        .dashboardHeroBox {
          min-width: 250px;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
        };
          background: rgba(255,255,255,0.78);
          padding: 22px;
          box-shadow: 0 14px 34px rgba(30,20,10,0.045);
        }

        .dashboardHeroBoxLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667085;
          margin-bottom: 7px;
        };
          margin-bottom: 10px;
        }

        .dashboardHeroBoxValue {
          color: #191a1d;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: -0.025em;
        };
          font-size: 24px;
          line-height: 1.15;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .dashboardHeroBoxText {
          margin-top: 8px;
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 500;
        };
          font-size: 13.5px;
          line-height: 1.6;
          font-weight: 650;
        }

        .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardStat {
          min-width: 0;
          background: #fff;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
        };
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 16px 42px rgba(30,20,10,0.045);
          min-width: 0;
        }

        .dashboardStatLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667085;
          margin-bottom: 7px;
        };
          margin-bottom: 10px;
        }

        .dashboardStatValue {
          color: #191a1d;
          font-size: clamp(24px, 2.5vw, 30px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        };
          font-size: 34px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.045em;
          overflow-wrap: anywhere;
        }

        .dashboardStatText {
          margin-top: 7px;
          color: #667085;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        };
          font-size: 13.5px;
          line-height: 1.55;
          font-weight: 650;
        }

        .dashboardQuickGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .quickCard {
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
          text-decoration: none;
          color: #191a1d;
          display: grid;
          gap: 9px;
          min-width: 0;
          transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
        };
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
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #f8f2e7;
          border: 1px solid #e2d7c3;
          color: #a97d2f;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
        };
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 950;
        }

        .quickCardTitle {
          font-size: 16px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #191a1d;
        };
        }

        .quickCardText {
          color: #667085;
          font-size: 12.5px;
          line-height: 1.55;
          font-weight: 500;
        };
          font-size: 14px;
          line-height: 1.6;
          font-weight: 650;
        }

        .ordersCard {
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          overflow: hidden;
        };
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
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

          .dashboardHeroBox {
          min-width: 250px;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
        }

          .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

          .dashboardQuickGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

          .orderRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
          }
        }

        @media (max-width: 720px) {
          .dashboardPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
        }

          .dashboardHero,
          .ordersCard {
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          overflow: hidden;
        }

          .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

          .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 760px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }

          .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

          .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }

          .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

          .dashboardStat {
          min-width: 0;
          background: #fff;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
        }

          .dashboardStatValue {
          color: #191a1d;
          font-size: clamp(24px, 2.5vw, 30px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        }

          .quickCard {
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
          text-decoration: none;
          color: #191a1d;
          display: grid;
          gap: 9px;
          min-width: 0;
          transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
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
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
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
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
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
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .dashboardEyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          margin-bottom: 8px;
          color: #a97d2f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

        .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 760px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }

        .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #fff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
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
          min-width: 250px;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
        }

        .dashboardStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardStat {
          min-width: 0;
          background: #fff;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
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
          color: #191a1d;
          font-size: clamp(24px, 2.5vw, 30px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        }

        .dashboardQuickGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
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
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          overflow: hidden;
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
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

          .dashboardHeroInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        }

        @media (max-width: 720px) {
          .dashboardHero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

          .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

          .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

          .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }
        }

        /* LMB LUXURY DASHBOARD V2 */

        .dashboardPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
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
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
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
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .dashboardEyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          margin-bottom: 8px;
          color: #a97d2f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

        .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 760px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }

        .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }

        .dashboardPrimaryBtn {
          border: 1px solid #a97d2f;
          background: #a97d2f;
          color: #fff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
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
          min-width: 250px;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
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
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboardStat {
          min-width: 0;
          background: #fff;
          border: 1px solid #e3e6ea;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035);
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
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #667085;
          margin-bottom: 7px;
        }

        .dashboardStatValue {
          color: #191a1d;
          font-size: clamp(24px, 2.5vw, 30px);
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
          border: 1px solid #e3e6ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          overflow: hidden;
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
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

          .dashboardHeroInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

          .dashboardHeroBox {
          min-width: 250px;
          border-radius: 12px;
          border: 1px solid #e3e6ea;
          background: #f8f9fa;
          padding: 16px;
          box-shadow: none;
        }
        }

        @media (max-width: 720px) {
          .dashboardPage {
          width: 100%;
          max-width: 1280px;
          display: grid;
          gap: 18px;
        }

          .dashboardHero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid #e3e6ea;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

          .dashboardHeroTitle {
          margin: 0;
          max-width: 760px;
          color: #191a1d;
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.12;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

          .dashboardHeroText {
          margin: 9px 0 0;
          max-width: 760px;
          color: #667085;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 500;
        }

          .dashboardHeroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

          .dashboardPrimaryBtn,
        .dashboardSecondaryBtn {
          border: 1px solid #e3e6ea;
          background: #fff;
          color: #191a1d;
        }

          .dashboardStat,
          .dashboardQuickCard {
            border-radius: 19px;
          }
        }

        /* REAL DASHBOARD CLEANUP */
        .dashboardPage {
          max-width: 1080px !important;
          margin: 0 auto !important;
          gap: 14px !important;
          overflow-x: hidden !important;
        }

        .dashboardHero {
          display: none !important;
        }

        .dashboardStats {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .dashboardStat {
          padding: 16px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035) !important;
        }

        .dashboardStatLabel {
          margin-bottom: 7px !important;
          color: #667085 !important;
          font-size: 9.5px !important;
          font-weight: 800 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .dashboardStatValue {
          color: #191a1d !important;
          font-size: 27px !important;
          line-height: 1.05 !important;
          font-weight: 800 !important;
          letter-spacing: -0.03em !important;
        }

        .dashboardStatText {
          margin-top: 6px !important;
          color: #667085 !important;
          font-size: 11.5px !important;
          line-height: 1.4 !important;
          font-weight: 500 !important;
        }

        .dashboardQuickGrid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .quickCard {
          display: grid !important;
          grid-template-columns: 32px minmax(0, 1fr) !important;
          gap: 11px !important;
          align-items: start !important;
          padding: 15px !important;
          border-radius: 12px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.035) !important;
          text-decoration: none !important;
          color: #191a1d !important;
        }

        .quickCardIcon {
          width: 32px !important;
          height: 32px !important;
          border-radius: 8px !important;
          background: #f8f2e7 !important;
          border: 1px solid #e2d7c3 !important;
          color: #a97d2f !important;
          font-size: 13px !important;
        }

        .quickCardTitle {
          font-size: 14.5px !important;
          line-height: 1.25 !important;
          font-weight: 800 !important;
          color: #191a1d !important;
        }

        .quickCardText {
          margin-top: 3px !important;
          color: #667085 !important;
          font-size: 12px !important;
          line-height: 1.45 !important;
          font-weight: 500 !important;
        }

        .ordersCard {
          border-radius: 14px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04) !important;
          overflow: hidden !important;
        }

        .ordersCard h2 {
          margin: 0 !important;
          font-size: 20px !important;
          line-height: 1.2 !important;
          font-weight: 800 !important;
          letter-spacing: -0.025em !important;
        }

        .ordersCard a {
          min-height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: fit-content !important;
          padding: 0 12px !important;
          border-radius: 8px !important;
          border: 1px solid #e5e7eb !important;
          background: #ffffff !important;
          color: #191a1d !important;
          font-size: 12px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          text-decoration: none !important;
        }

        .ordersCard a:hover {
          background: #f8fafc !important;
          border-color: #d0d5dd !important;
          text-decoration: none !important;
        }

        @media (max-width: 1180px) {
          .dashboardStats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .dashboardQuickGrid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          .dashboardStats {
            grid-template-columns: 1fr !important;
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