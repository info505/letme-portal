import { useLoaderData, useLocation } from "react-router";
import { dict, withLang } from "../lib/i18n.js";

function getInitials(user) {
  const first = user?.firstName?.[0];
  const last = user?.lastName?.[0];

  if (first && last) return `${first}${last}`.toUpperCase();

  const source =
    user?.firstName?.[0] ||
    user?.companyName?.[0] ||
    user?.email?.[0] ||
    user?.username?.[0] ||
    "P";

  return source.toUpperCase();
}

function getDisplayName(user) {
  const full = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (full) return full;
  if (user?.companyName) return user.companyName;
  if (user?.email) return user.email;

  return "Portal";
}

function getCompanyName(user) {
  if (user?.companyName) return user.companyName;
  if (user?.email) return user.email;

  return "Firmenkonto";
}

function getRoleLabel(user, locale) {
  if (user?.isAdmin) {
    return locale === "en" ? "Administrator" : "Administrator";
  }

  if (user?.role === "FINANCE") {
    return locale === "en" ? "Finance" : "Finanzen";
  }

  return locale === "en" ? "Business customer" : "Firmenkunde";
}

function isActivePath(pathname, href) {
  const cleanHref = href.split("?")[0];

  if (cleanHref === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function PortalIcon({ name }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-7h5v7" />
        </svg>
      );

    case "orders":
      return (
        <svg {...commonProps}>
          <path d="M7 3h10a2 2 0 0 1 2 2v16H5V5a2 2 0 0 1 2-2Z" />
          <path d="M8.5 8h7" />
          <path d="M8.5 12h7" />
          <path d="M8.5 16h4" />
        </svg>
      );

    case "billing":
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      );

    case "address":
      return (
        <svg {...commonProps}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );

    case "cost":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9.5c0-1 1-1.8 2.4-1.8h1.2c1.3 0 2.4.8 2.4 1.8 0 1.2-1 1.7-3 2.2s-3 1-3 2.3c0 1.1 1 2 2.5 2h1c1.5 0 2.5-.8 2.5-2" />
          <path d="M12 5.5v13" />
        </svg>
      );

    case "invoice":
      return (
        <svg {...commonProps}>
          <path d="M6 3h9l3 3v15H6Z" />
          <path d="M15 3v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
        </svg>
      );

    case "lock":
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
        </svg>
      );

    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 5H5v14h5" />
          <path d="m14 8 4 4-4 4" />
          <path d="M18 12H9" />
        </svg>
      );

    case "plus":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    default:
      return null;
  }
}

function SidebarLink({ href, label, icon, active = false }) {
  return (
    <a
      href={href}
      className={`portalNavLink ${active ? "isActive" : ""}`}
    >
      <span className="portalNavIcon">
        <PortalIcon name={icon} />
      </span>

      <span className="portalNavLabel">{label}</span>
    </a>
  );
}

export default function PortalLayout({
  children,
  title,
  subtitle,
  orderNowHref,
  orderNowOnClick,
}) {
  const location = useLocation();
  const data = useLoaderData?.() || {};

  const locale =
    data?.locale ||
    new URLSearchParams(location.search).get("lang") ||
    "de";

  const user = data?.user || null;
  const t = dict[locale] || dict.de;

  const sidebarOrderHref =
    orderNowHref ||
    "https://letmebowl-catering.de/pages/bestellen";

  const navItems = [
    {
      href: withLang("/dashboard", locale),
      label: t.account || "Konto",
      mobileLabel: locale === "en" ? "Home" : "Konto",
      icon: "home",
    },
    {
      href: withLang("/bestellungen", locale),
      label: t.ordersTitle || "Bestellungen",
      mobileLabel: locale === "en" ? "Orders" : "Bestellungen",
      icon: "orders",
    },
    {
      href: withLang("/rechnungsadresse", locale),
      label: t.billingAddressNav || "Rechnungsadresse",
      mobileLabel: locale === "en" ? "Billing" : "Rechnung",
      icon: "billing",
    },
    {
      href: withLang("/lieferadressen", locale),
      label: t.shippingAddressesNav || "Lieferadressen",
      mobileLabel: locale === "en" ? "Addresses" : "Adressen",
      icon: "address",
    },
    {
      href: withLang("/kostenstellen", locale),
      label: t.costCentersNav || "Kostenstellen",
      mobileLabel: locale === "en" ? "Cost centers" : "Kostenstellen",
      icon: "cost",
    },
    {
      href: withLang("/rechnungen", locale),
      label: t.invoices || "Rechnungen",
      mobileLabel: locale === "en" ? "Invoices" : "Rechnungen",
      icon: "invoice",
    },
  ];

  const orderButtonContent = (
    <>
      <PortalIcon name="plus" />
      <span>{t.orderNow || "Jetzt bestellen"}</span>
    </>
  );

  return (
    <div className="portalRoot">
      <style>{`
        :root {
          --portal-bg: #f5f6f7;
          --portal-sidebar: #ffffff;
          --portal-surface: #ffffff;
          --portal-surface-muted: #f8f9fa;
          --portal-surface-soft: #fbfbfc;
          --portal-text: #191a1d;
          --portal-text-soft: #344054;
          --portal-muted: #667085;
          --portal-muted-light: #98a2b3;
          --portal-border: #e3e6ea;
          --portal-border-strong: #d0d5dd;
          --portal-brand: #a97d2f;
          --portal-brand-hover: #8c6422;
          --portal-brand-soft: #f8f2e7;
          --portal-green: #16794f;
          --portal-green-soft: #edf8f2;
          --portal-red: #b42318;
          --portal-red-soft: #fff4f2;
          --portal-radius-sm: 8px;
          --portal-radius: 12px;
          --portal-radius-lg: 16px;
          --portal-shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.04);
          --portal-shadow-sm:
            0 1px 3px rgba(16, 24, 40, 0.05),
            0 1px 2px rgba(16, 24, 40, 0.03);
        }

        * {
          box-sizing: border-box;
        }

        .portalRoot {
          min-height: 100vh;
          background: var(--portal-bg);
          color: var(--portal-text);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .portalLayout {
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr);
          min-height: 100vh;
        }

        .portalSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 20px 14px 16px;
          overflow-y: auto;
          background: #ffffff;
          border-right: 1px solid var(--portal-border);
        }

        .portalBrand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 0 6px 16px;
          color: var(--portal-text);
          text-decoration: none;
          border-bottom: 1px solid var(--portal-border);
        }

        .portalBrandMark {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid #dfd3bd;
          background: var(--portal-brand-soft);
          color: var(--portal-brand);
          font-size: 11px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .portalBrandText {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .portalBrandTitle {
          overflow: hidden;
          color: var(--portal-text);
          font-size: 13px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: 0.035em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portalBrandSub {
          overflow: hidden;
          color: var(--portal-muted);
          font-size: 10px;
          line-height: 1.25;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portalUserCard {
          margin: 14px 0 14px;
          padding: 0 6px 14px;
          border: 0;
          border-bottom: 1px solid var(--portal-border);
          border-radius: 0;
          background: transparent;
        }

        .portalUserTop {
          display: block;
          min-width: 0;
        }

        .portalUserAvatar {
          display: none;
        }

        .portalUserText {
          min-width: 0;
        }

        .portalUserName {
          overflow: hidden;
          color: var(--portal-text);
          font-size: 12px;
          line-height: 1.3;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portalUserCompany {
          display: -webkit-box;
          margin-top: 3px;
          overflow: hidden;
          color: var(--portal-muted);
          font-size: 11px;
          line-height: 1.35;
          font-weight: 500;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .portalUserMeta {
          display: none;
        }

        .portalPill {
          min-height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid var(--portal-border);
          background: #ffffff;
          color: var(--portal-muted);
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
        }

        .portalPillGreen {
          border-color: #cdebdc;
          background: var(--portal-green-soft);
          color: var(--portal-green);
        }

        .portalNav {
          display: grid;
          gap: 4px;
        }

        .portalNavLink {
          position: relative;
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: var(--portal-muted);
          font-size: 12.5px;
          line-height: 1.2;
          font-weight: 650;
          text-decoration: none;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
        }

        .portalNavLink:hover {
          border-color: var(--portal-border);
          background: var(--portal-surface-muted);
          color: var(--portal-text);
        }

        .portalNavLink.isActive {
          border-color: #e2d7c3;
          background: #f8f2e7;
          color: #6e4f1c;
          font-weight: 750;
        }

        .portalNavLink.isActive::before {
          content: "";
          position: absolute;
          top: 9px;
          bottom: 9px;
          left: -17px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: var(--portal-brand);
        }

        .portalNavIcon {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: currentColor;
        }

        .portalNavLabel {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portalSidebarBottom {
          display: grid;
          gap: 9px;
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid var(--portal-border);
        }

        .portalSecurity {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
          padding: 9px;
          border: 1px solid var(--portal-border);
          border-radius: 8px;
          background: var(--portal-surface-muted);
        }

        .portalSecurityIcon {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--portal-green);
        }

        .portalSecurityTitle {
          color: var(--portal-text-soft);
          font-size: 10.5px;
          line-height: 1.3;
          font-weight: 750;
        }

        .portalSecurityText {
          margin-top: 2px;
          color: var(--portal-muted);
          font-size: 9.5px;
          line-height: 1.35;
          font-weight: 500;
        }

        .portalOrderButton,
        .portalLogoutButton {
          min-height: 40px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 13px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12.5px;
          line-height: 1;
          font-weight: 750;
          text-align: center;
          text-decoration: none;
          cursor: pointer;
          transition:
            background 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .portalOrderButton {
          border: 1px solid var(--portal-brand);
          background: var(--portal-brand);
          color: #ffffff;
          box-shadow: var(--portal-shadow-xs);
        }

        .portalOrderButton:hover {
          border-color: var(--portal-brand-hover);
          background: var(--portal-brand-hover);
          transform: translateY(-1px);
        }

        .portalLogoutButton {
          border: 1px solid var(--portal-border);
          background: #ffffff;
          color: var(--portal-muted);
        }

        .portalLogoutButton:hover {
          border-color: #f1b8b3;
          background: var(--portal-red-soft);
          color: var(--portal-red);
        }

        .portalMain {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .portalHeader {
          position: sticky;
          top: 0;
          z-index: 30;
          padding: 22px 30px 20px;
          border-bottom: 1px solid var(--portal-border);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .portalHeaderInner {
          width: 100%;
          max-width: 1360px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin: 0 auto;
        }

        .portalHeaderText {
          min-width: 0;
        }

        .portalKicker {
          margin-bottom: 6px;
          color: var(--portal-brand);
          font-size: 10px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .portalTitle {
          margin: 0;
          color: var(--portal-text);
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.12;
          font-weight: 800;
          letter-spacing: -0.035em;
          overflow-wrap: anywhere;
        }

        .portalSubtitle {
          max-width: 760px;
          margin: 7px 0 0;
          color: var(--portal-muted);
          font-size: 13px;
          line-height: 1.55;
          font-weight: 500;
        }

        .portalHeaderActions {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .portalLangSwitch {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border: 1px solid var(--portal-border);
          border-radius: 9px;
          background: var(--portal-surface-muted);
        }

        .portalLangLink {
          min-width: 38px;
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: var(--portal-muted);
          font-size: 11px;
          line-height: 1;
          font-weight: 750;
          text-decoration: none;
        }

        .portalLangLink.isActive {
          background: #ffffff;
          color: var(--portal-text);
          box-shadow: var(--portal-shadow-xs);
        }

        .portalContent {
          width: 100%;
          max-width: 1420px;
          min-width: 0;
          padding: 26px 30px 38px;
          margin: 0 auto;
        }

        .portalMobileBar,
        .portalMobileOrder {
          display: none;
        }

        @media (max-width: 1120px) {
          .portalLayout {
            grid-template-columns: 238px minmax(0, 1fr);
          }

          .portalSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 20px 14px 16px;
          overflow-y: auto;
          background: #ffffff;
          border-right: 1px solid var(--portal-border);
        }

          .portalHeader {
            padding-right: 22px;
            padding-left: 22px;
          }

          .portalContent {
            padding-right: 22px;
            padding-left: 22px;
          }
        }

        @media (max-width: 900px) {
          .portalLayout {
            display: block;
          }

          .portalSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 20px 14px 16px;
          overflow-y: auto;
          background: #ffffff;
          border-right: 1px solid var(--portal-border);
        }

          .portalMobileBar {
            position: sticky;
            top: 0;
            z-index: 60;
            display: block;
            padding: 10px 14px;
            border-bottom: 1px solid var(--portal-border);
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .portalMobileTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .portalMobileBrand {
            display: flex;
            align-items: center;
            gap: 9px;
            min-width: 0;
          }

          .portalMobileAvatar {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #dfd3bd;
            border-radius: 9px;
            background: var(--portal-brand-soft);
            color: var(--portal-brand);
            font-size: 11px;
            font-weight: 800;
          }

          .portalMobileName {
            overflow: hidden;
            color: var(--portal-text);
            font-size: 12px;
            line-height: 1.25;
            font-weight: 750;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .portalMobileCompany {
            overflow: hidden;
            margin-top: 2px;
            color: var(--portal-muted);
            font-size: 10px;
            line-height: 1.25;
            font-weight: 500;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .portalMobileLogout {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
            padding: 0 10px;
            border: 1px solid var(--portal-border);
            border-radius: 8px;
            background: #ffffff;
            color: var(--portal-muted);
            font-size: 11px;
            line-height: 1;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
          }

          .portalMobileNav {
            display: flex;
            gap: 6px;
            margin-top: 9px;
            padding-bottom: 1px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .portalMobileNav::-webkit-scrollbar {
            display: none;
          }

          .portalMobileNavLink {
            min-height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            flex: 0 0 auto;
            padding: 0 10px;
            border: 1px solid var(--portal-border);
            border-radius: 8px;
            background: var(--portal-surface-muted);
            color: var(--portal-muted);
            font-size: 10px;
            line-height: 1;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
          }

          .portalMobileNavLink.isActive {
            border-color: #dfd3bd;
            background: var(--portal-brand-soft);
            color: #6e4f1c;
          }

          .portalMobileNavIcon {
            width: 17px;
            height: 17px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .portalHeader {
            position: static;
            padding: 19px 16px 16px;
            background: #ffffff;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .portalHeaderInner {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
          }

          .portalTitle {
            font-size: 27px;
          }

          .portalSubtitle {
            font-size: 12px;
          }

          .portalMobileOrder {
            display: block;
            grid-column: 1 / -1;
          }

          .portalContent {
            padding: 18px 16px 28px;
          }
        }

        @media (max-width: 560px) {
          .portalMobileBar {
            padding-right: 12px;
            padding-left: 12px;
          }

          .portalHeader {
            padding-right: 13px;
            padding-left: 13px;
          }

          .portalHeaderInner {
            grid-template-columns: 1fr;
          }

          .portalHeaderActions {
            position: absolute;
            top: 16px;
            right: 13px;
          }

          .portalHeaderText {
            padding-right: 90px;
          }

          .portalTitle {
            font-size: 24px;
          }

          .portalContent {
            padding-right: 13px;
            padding-left: 13px;
          }
        }
        /* CLEAN FINAL PORTAL FRAME */
        html,
        body,
        .portalRoot {
          overflow-x: hidden !important;
          background: #f4f5f7 !important;
        }

        .portalLayout {
          grid-template-columns: 218px minmax(0, 1fr) !important;
        }

        .portalSidebar {
          padding: 16px 12px !important;
          background: #ffffff !important;
          border-right: 1px solid #e5e7eb !important;
        }

        .portalBrand {
          padding: 0 5px 14px !important;
          margin: 0 !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        .portalBrandMark {
          width: 30px !important;
          height: 30px !important;
          flex: 0 0 30px !important;
          border-radius: 8px !important;
          font-size: 9.5px !important;
        }

        .portalBrandTitle {
          font-size: 12px !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          letter-spacing: 0.035em !important;
        }

        .portalBrandSub {
          margin-top: 1px !important;
          font-size: 9.5px !important;
          line-height: 1.2 !important;
          font-weight: 500 !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
          color: #667085 !important;
        }

        .portalUserCard {
          display: none !important;
        }

        .portalNav {
          margin-top: 16px !important;
          gap: 2px !important;
        }

        .portalNavLink {
          min-height: 37px !important;
          padding: 0 10px !important;
          border-radius: 8px !important;
          font-size: 12.5px !important;
          font-weight: 650 !important;
          color: #475467 !important;
          border: 1px solid transparent !important;
          background: transparent !important;
        }

        .portalNavLink:hover {
          background: #f8fafc !important;
          border-color: #eef0f3 !important;
          color: #191a1d !important;
        }

        .portalNavLink.isActive {
          background: #f8f2e7 !important;
          border-color: #e2d7c3 !important;
          color: #6f501c !important;
          box-shadow: none !important;
        }

        .portalNavLink.isActive::before {
          display: none !important;
        }

        .portalNavIcon {
          width: 19px !important;
          height: 19px !important;
          flex: 0 0 19px !important;
        }

        .portalSidebarBottom {
          gap: 8px !important;
          padding-top: 14px !important;
          border-top: 1px solid #e5e7eb !important;
        }

        .portalSecurity {
          display: none !important;
        }

        .portalOrderButton,
        .portalLogoutButton {
          min-height: 38px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          box-shadow: none !important;
        }

        .portalOrderButton {
          background: #a97d2f !important;
          border-color: #a97d2f !important;
        }

        .portalLogoutButton {
          background: #ffffff !important;
          color: #667085 !important;
          border-color: #e5e7eb !important;
        }

        .portalHeader {
          position: sticky !important;
          top: 0 !important;
          background: #ffffff !important;
          border-bottom: 1px solid #e5e7eb !important;
          padding: 16px 26px !important;
        }

        .portalHeaderInner {
          max-width: 1120px !important;
          margin: 0 auto !important;
          align-items: center !important;
        }

        .portalKicker {
          margin-bottom: 4px !important;
          color: #a97d2f !important;
          font-size: 9.5px !important;
          font-weight: 850 !important;
          letter-spacing: 0.09em !important;
        }

        .portalTitle {
          font-size: clamp(24px, 2.5vw, 30px) !important;
          line-height: 1.08 !important;
          font-weight: 900 !important;
          letter-spacing: -0.045em !important;
          color: #17191c !important;
        }

        .portalSubtitle {
          margin-top: 5px !important;
          max-width: 680px !important;
          color: #667085 !important;
          font-size: 12.5px !important;
          line-height: 1.45 !important;
          font-weight: 500 !important;
        }

        .portalLangSwitch {
          border-radius: 8px !important;
          background: #f8fafc !important;
          border-color: #e5e7eb !important;
          box-shadow: none !important;
        }

        .portalLangLink {
          min-height: 28px !important;
          min-width: 36px !important;
          border-radius: 6px !important;
          font-size: 10.5px !important;
        }

        .portalContent {
          max-width: 1120px !important;
          margin: 0 auto !important;
          padding: 18px 26px 34px !important;
          overflow-x: hidden !important;
        }

        @media (max-width: 900px) {
          .portalLayout {
            display: block !important;
          }

          .portalSidebar {
            display: none !important;
          }

          .portalHeader {
            padding: 15px 14px !important;
          }

          .portalContent {
            padding: 16px 14px 28px !important;
          }
        }
        /* PORTAL WIDTH FIX */
        .portalLayout {
          grid-template-columns: 248px minmax(0, 1fr) !important;
        }

        .portalSidebar {
          width: 248px !important;
          min-width: 248px !important;
          padding: 18px 14px !important;
        }

        .portalHeader {
          padding: 14px 24px !important;
        }

        .portalHeaderInner {
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
        }

        .portalContent {
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 18px 24px 32px !important;
        }

        .portalMain {
          min-width: 0 !important;
        }

        @media (max-width: 900px) {
          .portalSidebar {
            width: auto !important;
            min-width: 0 !important;
          }

          .portalHeader {
            padding: 14px 14px !important;
          }

          .portalContent {
            padding: 14px 14px 24px !important;
          }
        }
        /* SIDEBAR BOTTOM CLEAN FIX */
        .portalSidebar {
          overflow-x: hidden !important;
        }

        .portalSidebarBottom {
          position: sticky !important;
          bottom: 0 !important;
          background: #ffffff !important;
          padding-top: 12px !important;
          padding-bottom: 0 !important;
        }

        .portalOrderButton,
        .portalLogoutButton {
          width: 100% !important;
          min-height: 38px !important;
        }
        /* SIDEBAR POLISH FINAL */
        .portalSidebar {
          padding-bottom: 16px !important;
        }

        .portalSidebarBottom {
          position: static !important;
          margin-top: auto !important;
          padding-top: 14px !important;
          background: #ffffff !important;
        }

        .portalOrderButton {
          margin-bottom: 0 !important;
        }

        .portalLogoutButton {
          margin-top: 0 !important;
        }

      `}</style>

      <div className="portalLayout">
        <aside className="portalSidebar">
          <a
            href="https://letmebowl-catering.de"
            className="portalBrand"
          >
            <span className="portalBrandMark">LMB</span>

            <span className="portalBrandText">
              <span className="portalBrandTitle">LET ME BOWL</span>

              <span className="portalBrandSub">
                {locale === "en" ? "Company account" : "Firmenkonto"}
              </span>
            </span>
          </a>

          <div className="portalUserCard">
            <div className="portalUserTop">
              <div className="portalUserAvatar">
                {getInitials(user)}
              </div>

              <div className="portalUserText">
                <div className="portalUserName">
                  {getDisplayName(user)}
                </div>

                <div
                  className="portalUserCompany"
                  title={getCompanyName(user)}
                >
                  {getCompanyName(user)}
                </div>
              </div>
            </div>

            <div className="portalUserMeta">
              <span className="portalPill portalPillGreen">
                {locale === "en" ? "Active" : "Aktiv"}
              </span>

              <span className="portalPill">
                {getRoleLabel(user, locale)}
              </span>
            </div>
          </div>

          <nav className="portalNav">
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActivePath(location.pathname, item.href)}
              />
            ))}
          </nav>

          <div className="portalSidebarBottom">
            <div className="portalSecurity">
              <div className="portalSecurityIcon">
                <PortalIcon name="lock" />
              </div>

              <div>
                <div className="portalSecurityTitle">
                  {locale === "en"
                    ? "Protected company account"
                    : "Geschütztes Firmenkonto"}
                </div>

                <div className="portalSecurityText">
                  {locale === "en"
                    ? "Access is limited to signed-in users."
                    : "Zugriff nur für angemeldete Benutzer."}
                </div>
              </div>
            </div>

            {orderNowOnClick ? (
              <button
                type="button"
                onClick={orderNowOnClick}
                className="portalOrderButton"
              >
                {orderButtonContent}
              </button>
            ) : (
              <a
                href={sidebarOrderHref}
                className="portalOrderButton"
              >
                {orderButtonContent}
              </a>
            )}

            <a
              href={withLang("/logout", locale)}
              className="portalLogoutButton"
            >
              <PortalIcon name="logout" />
              <span>{t.logout || "Abmelden"}</span>
            </a>
          </div>
        </aside>

        <main className="portalMain">
          <div className="portalMobileBar">
            <div className="portalMobileTop">
              <div className="portalMobileBrand">
                <div className="portalMobileAvatar">
                  {getInitials(user)}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div className="portalMobileName">
                    {getDisplayName(user)}
                  </div>

                  <div className="portalMobileCompany">
                    {getCompanyName(user)}
                  </div>
                </div>
              </div>

              <a
                href={withLang("/logout", locale)}
                className="portalMobileLogout"
              >
                {t.logout || "Abmelden"}
              </a>
            </div>

            <nav className="portalMobileNav">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`portalMobileNavLink ${
                    isActivePath(location.pathname, item.href)
                      ? "isActive"
                      : ""
                  }`}
                >
                  <span className="portalMobileNavIcon">
                    <PortalIcon name={item.icon} />
                  </span>

                  <span>{item.mobileLabel}</span>
                </a>
              ))}
            </nav>
          </div>

          <header className="portalHeader">
            <div className="portalHeaderInner">
              <div className="portalHeaderText">
                <div className="portalKicker">
                  {locale === "en"
                    ? "Let Me Bowl business account"
                    : "Let Me Bowl Firmenkonto"}
                </div>

                <h1 className="portalTitle">{title}</h1>

                {subtitle ? (
                  <p className="portalSubtitle">{subtitle}</p>
                ) : null}
              </div>

              <div className="portalHeaderActions">
                <div className="portalLangSwitch">
                  <a
                    href={withLang(location.pathname, "de")}
                    className={`portalLangLink ${
                      locale === "de" ? "isActive" : ""
                    }`}
                  >
                    DE
                  </a>

                  <a
                    href={withLang(location.pathname, "en")}
                    className={`portalLangLink ${
                      locale === "en" ? "isActive" : ""
                    }`}
                  >
                    EN
                  </a>
                </div>
              </div>

              <div className="portalMobileOrder">
                {orderNowOnClick ? (
                  <button
                    type="button"
                    onClick={orderNowOnClick}
                    className="portalOrderButton"
                  >
                    {orderButtonContent}
                  </button>
                ) : (
                  <a
                    href={sidebarOrderHref}
                    className="portalOrderButton"
                  >
                    {orderButtonContent}
                  </a>
                )}
              </div>
            </div>
          </header>

          <section className="portalContent">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}