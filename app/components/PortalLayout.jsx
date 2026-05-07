import { useLoaderData, useLocation } from "react-router";
import { colors } from "../lib/ui.js";
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
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
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
  if (user?.isAdmin) return locale === "en" ? "Admin" : "Administrator";
  if (user?.role === "FINANCE") return locale === "en" ? "Finance" : "Finanzen";
  return locale === "en" ? "Business customer" : "Firmenkunde";
}

function isActivePath(pathname, href) {
  const cleanHref = href.split("?")[0];

  if (cleanHref === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function SidebarLink({ href, label, icon, active = false }) {
  return (
    <a href={href} className={`portalNavLink ${active ? "isActive" : ""}`}>
      <span className="portalNavIcon">{icon}</span>
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
    data?.locale || new URLSearchParams(location.search).get("lang") || "de";

  const user = data?.user || null;
  const t = dict[locale] || dict.de;

  const sidebarOrderHref =
    orderNowHref || "https://letmebowl-catering.de/pages/bestellen";

  const navItems = [
    {
      href: withLang("/dashboard", locale),
      label: t.account || "Konto",
      mobileLabel: locale === "en" ? "Home" : "Konto",
      icon: "⌂",
    },
    {
      href: withLang("/bestellungen", locale),
      label: t.ordersTitle || "Bestellungen",
      mobileLabel: locale === "en" ? "Orders" : "Bestellungen",
      icon: "▤",
    },
    {
      href: withLang("/rechnungsadresse", locale),
      label: t.billingAddressNav || "Rechnungsadresse",
      mobileLabel: locale === "en" ? "Billing" : "Rechnung",
      icon: "◧",
    },
    {
      href: withLang("/lieferadressen", locale),
      label: t.shippingAddressesNav || "Lieferadressen",
      mobileLabel: locale === "en" ? "Addresses" : "Adressen",
      icon: "⌖",
    },
    {
      href: withLang("/kostenstellen", locale),
      label: t.costCentersNav || "Kostenstellen",
      mobileLabel: locale === "en" ? "Cost centers" : "Kostenstellen",
      icon: "◎",
    },
    {
      href: withLang("/rechnungen", locale),
      label: t.invoices || "Rechnungen",
      mobileLabel: locale === "en" ? "Invoices" : "Rechnungen",
      icon: "◫",
    },
  ];

  return (
    <div className="portalRoot">
      <style>{`
        :root {
          --portal-bg: ${colors.bg || "#f7f4ee"};
          --portal-card: #ffffff;
          --portal-card-soft: #fbf8f2;
          --portal-text: ${colors.text || "#171717"};
          --portal-muted: ${colors.muted || "#756b5f"};
          --portal-border: ${colors.border || "#e8decd"};
          --portal-gold: #c8a96a;
          --portal-gold-dark: #a9823c;
          --portal-green: #2f6a4a;
          --portal-red: #8b2222;
          --portal-shadow: 0 22px 60px rgba(30, 20, 10, 0.07);
          --portal-shadow-soft: 0 12px 34px rgba(30, 20, 10, 0.05);
        }

        .portalRoot {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 26%),
            linear-gradient(180deg, var(--portal-bg) 0%, #efe9df 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--portal-text);
        }

        .portalLayout {
          display: grid;
          grid-template-columns: 304px minmax(0, 1fr);
          min-height: 100vh;
        }

        .portalSidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 24px 18px;
          background:
            radial-gradient(circle at top left, rgba(200,169,106,0.12), transparent 32%),
            linear-gradient(180deg, #fffdf8 0%, #f8f1e6 100%);
          border-right: 1px solid rgba(232,222,205,0.95);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .portalBrand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--portal-text);
          margin-bottom: 22px;
          padding: 6px 8px;
        }

        .portalBrandMark {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid var(--portal-border);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 950;
          color: var(--portal-gold-dark);
          box-shadow: 0 8px 20px rgba(30,20,10,0.05);
        }

        .portalBrandText {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .portalBrandTitle {
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 0.08em;
          line-height: 1.1;
          white-space: nowrap;
        }

        .portalBrandSub {
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--portal-gold-dark);
          white-space: nowrap;
        }

        .portalUserCard {
          padding: 16px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(200,169,106,0.14), transparent 40%),
            rgba(255,255,255,0.78);
          border: 1px solid rgba(232,222,205,0.95);
          box-shadow: var(--portal-shadow-soft);
          margin-bottom: 18px;
        }

        .portalUserTop {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }

        .portalUserAvatar {
          width: 48px;
          height: 48px;
          border-radius: 18px;
          background: linear-gradient(135deg, #fff 0%, #f6ecd9 100%);
          border: 1px solid rgba(200,169,106,0.32);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          color: var(--portal-gold-dark);
          flex: 0 0 48px;
        }

        .portalUserText {
          min-width: 0;
        }

        .portalUserName {
          color: var(--portal-text);
          font-size: 15px;
          font-weight: 950;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .portalUserCompany {
          color: var(--portal-muted);
          font-size: 13px;
          margin-top: 4px;
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .portalUserMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .portalPill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          background: #fff;
          border: 1px solid var(--portal-border);
          color: var(--portal-muted);
        }

        .portalPillGreen {
          background: rgba(47,106,74,0.08);
          border-color: rgba(47,106,74,0.18);
          color: var(--portal-green);
        }

        .portalNav {
          display: grid;
          gap: 7px;
          margin-top: 4px;
        }

        .portalNavLink {
          text-decoration: none;
          min-height: 48px;
          padding: 0 13px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          gap: 11px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--portal-muted);
          font-size: 14px;
          font-weight: 820;
          transition: 0.18s ease;
        }

        .portalNavLink:hover {
          background: rgba(255,255,255,0.72);
          color: var(--portal-text);
          border-color: rgba(232,222,205,0.9);
        }

        .portalNavLink.isActive {
          background: #fff;
          color: var(--portal-text);
          border-color: rgba(200,169,106,0.34);
          box-shadow: 0 10px 24px rgba(30,20,10,0.055);
        }

        .portalNavIcon {
          width: 28px;
          height: 28px;
          border-radius: 11px;
          background: rgba(200,169,106,0.10);
          color: var(--portal-gold-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 28px;
          font-size: 14px;
          font-weight: 950;
        }

        .portalNavLabel {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .portalSidebarBottom {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid rgba(232,222,205,0.95);
          display: grid;
          gap: 10px;
        }

        .portalOrderButton,
        .portalLogoutButton {
          min-height: 50px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 950;
          text-align: center;
          cursor: pointer;
        }

        .portalOrderButton {
          background: linear-gradient(135deg, var(--portal-gold), var(--portal-gold-dark));
          color: #fff;
          border: 1px solid rgba(169,130,60,0.2);
          box-shadow: 0 14px 28px rgba(200,169,106,0.22);
        }

        .portalLogoutButton {
          background: rgba(255,255,255,0.74);
          color: var(--portal-red);
          border: 1px solid rgba(232,222,205,0.95);
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
          background: rgba(247,244,238,0.84);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(232,222,205,0.72);
          padding: 22px 28px;
        }

        .portalHeaderInner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          min-width: 0;
        }

        .portalHeaderText {
          min-width: 0;
        }

        .portalKicker {
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--portal-gold-dark);
          margin-bottom: 7px;
        }

        .portalTitle {
          margin: 0;
          font-size: clamp(28px, 3.4vw, 42px);
          color: var(--portal-text);
          line-height: 1.02;
          letter-spacing: -0.055em;
          font-weight: 950;
          overflow-wrap: anywhere;
        }

        .portalSubtitle {
          margin: 9px 0 0;
          color: var(--portal-muted);
          font-size: 15px;
          line-height: 1.6;
          max-width: 820px;
          font-weight: 600;
        }

        .portalHeaderActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .portalLangSwitch {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f6f1e8;
          border: 1px solid var(--portal-border);
          border-radius: 999px;
          padding: 4px;
          box-shadow: 0 8px 20px rgba(30,20,10,0.035);
        }

        .portalLangLink {
          text-decoration: none;
          color: var(--portal-muted);
          font-weight: 900;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 999px;
          line-height: 1;
        }

        .portalLangLink.isActive {
          color: var(--portal-text);
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .portalMobileOrder {
          display: none;
        }

        .portalMobileBar {
          display: none;
        }

        .portalContent {
          padding: 28px;
          min-width: 0;
        }

        @media (max-width: 1100px) {
          .portalLayout {
            grid-template-columns: 270px minmax(0, 1fr);
          }

          .portalSidebar {
            padding: 20px 14px;
          }

          .portalContent {
            padding: 22px;
          }
        }

        @media (max-width: 920px) {
          .portalLayout {
            display: block;
          }

          .portalSidebar {
            display: none;
          }

          .portalMobileBar {
            display: block;
            position: sticky;
            top: 0;
            z-index: 50;
            background:
              radial-gradient(circle at top right, rgba(200,169,106,0.18), transparent 34%),
              linear-gradient(180deg, #fffdf8 0%, #f8f1e6 100%);
            border-bottom: 1px solid rgba(232,222,205,0.95);
            padding: 12px 14px 10px;
            box-shadow: 0 16px 34px rgba(30,20,10,0.08);
          }

          .portalMobileTop {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
          }

          .portalMobileBrand {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }

          .portalMobileAvatar {
            width: 38px;
            height: 38px;
            border-radius: 14px;
            background: #fff;
            border: 1px solid rgba(200,169,106,0.28);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 950;
            color: var(--portal-gold-dark);
            flex: 0 0 38px;
          }

          .portalMobileName {
            font-size: 14px;
            font-weight: 950;
            color: var(--portal-text);
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .portalMobileCompany {
            margin-top: 3px;
            font-size: 12px;
            font-weight: 700;
            color: var(--portal-muted);
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .portalMobileLogout {
            text-decoration: none;
            color: var(--portal-red);
            background: #fff;
            border: 1px solid rgba(232,222,205,0.95);
            border-radius: 999px;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .portalMobileNav {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 2px;
            scrollbar-width: none;
          }

          .portalMobileNav::-webkit-scrollbar {
            display: none;
          }

          .portalMobileNavLink {
            text-decoration: none;
            min-height: 42px;
            padding: 0 12px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            white-space: nowrap;
            color: var(--portal-muted);
            background: rgba(255,255,255,0.58);
            border: 1px solid rgba(232,222,205,0.85);
            font-size: 12px;
            font-weight: 900;
            flex: 0 0 auto;
          }

          .portalMobileNavLink.isActive {
            background: #fff;
            color: var(--portal-text);
            border-color: rgba(200,169,106,0.38);
            box-shadow: 0 8px 18px rgba(30,20,10,0.05);
          }

          .portalHeader {
            position: static;
            padding: 18px 16px 14px;
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .portalHeaderInner {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .portalHeaderActions {
            justify-content: space-between;
          }

          .portalMobileOrder {
            display: block;
            width: 100%;
          }

          .portalMobileOrder .portalOrderButton {
            width: 100%;
          }

          .portalTitle {
            font-size: 32px;
          }

          .portalSubtitle {
            font-size: 14px;
          }

          .portalContent {
            padding: 0 16px 24px;
          }
        }

        @media (max-width: 520px) {
          .portalMobileBar {
            padding: 11px 12px 9px;
          }

          .portalMobileLogout {
            padding: 9px 10px;
          }

          .portalHeader {
            padding: 16px 14px 12px;
          }

          .portalContent {
            padding: 0 14px 22px;
          }

          .portalTitle {
            font-size: 29px;
          }

          .portalLangLink {
            padding: 8px 11px;
          }
        }
      `}</style>

      <div className="portalLayout">
        <aside className="portalSidebar">
          <a href="https://letmebowl-catering.de" className="portalBrand">
            <span className="portalBrandMark">LMB</span>
            <span className="portalBrandText">
              <span className="portalBrandTitle">LET ME BOWL</span>
              <span className="portalBrandSub">
                {locale === "en" ? "Business Portal" : "Firmenportal"}
              </span>
            </span>
          </a>

          <div className="portalUserCard">
            <div className="portalUserTop">
              <div className="portalUserAvatar">{getInitials(user)}</div>

              <div className="portalUserText">
                <div className="portalUserName">{getDisplayName(user)}</div>
                <div className="portalUserCompany">{getCompanyName(user)}</div>
              </div>
            </div>

            <div className="portalUserMeta">
              <span className="portalPill portalPillGreen">
                {locale === "en" ? "Active" : "Aktiv"}
              </span>
              <span className="portalPill">{getRoleLabel(user, locale)}</span>
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
            {orderNowOnClick ? (
              <button
                type="button"
                onClick={orderNowOnClick}
                className="portalOrderButton"
              >
                {t.orderNow || "Jetzt bestellen"}
              </button>
            ) : (
              <a href={sidebarOrderHref} className="portalOrderButton">
                {t.orderNow || "Jetzt bestellen"}
              </a>
            )}

            <a href={withLang("/logout", locale)} className="portalLogoutButton">
              {t.logout || "Abmelden"}
            </a>
          </div>
        </aside>

        <main className="portalMain">
          <div className="portalMobileBar">
            <div className="portalMobileTop">
              <div className="portalMobileBrand">
                <div className="portalMobileAvatar">{getInitials(user)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="portalMobileName">{getDisplayName(user)}</div>
                  <div className="portalMobileCompany">{getCompanyName(user)}</div>
                </div>
              </div>

              <a href={withLang("/logout", locale)} className="portalMobileLogout">
                {t.logout || "Abmelden"}
              </a>
            </div>

            <nav className="portalMobileNav">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`portalMobileNavLink ${
                    isActivePath(location.pathname, item.href) ? "isActive" : ""
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.mobileLabel}</span>
                </a>
              ))}
            </nav>
          </div>

          <header className="portalHeader">
            <div className="portalHeaderInner">
              <div className="portalHeaderText">
                <div className="portalKicker">
                  {locale === "en" ? "Let Me Bowl business account" : "Let Me Bowl Firmenkonto"}
                </div>

                <h1 className="portalTitle">{title}</h1>

                {subtitle ? <p className="portalSubtitle">{subtitle}</p> : null}
              </div>

              <div className="portalHeaderActions">
                <div className="portalLangSwitch">
                  <a
                    href={withLang(location.pathname, "de")}
                    className={`portalLangLink ${locale === "de" ? "isActive" : ""}`}
                  >
                    DE
                  </a>
                  <a
                    href={withLang(location.pathname, "en")}
                    className={`portalLangLink ${locale === "en" ? "isActive" : ""}`}
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
                    {t.orderNow || "Jetzt bestellen"}
                  </button>
                ) : (
                  <a href={sidebarOrderHref} className="portalOrderButton">
                    {t.orderNow || "Jetzt bestellen"}
                  </a>
                )}
              </div>
            </div>
          </header>

          <section className="portalContent">{children}</section>
        </main>
      </div>
    </div>
  );
}