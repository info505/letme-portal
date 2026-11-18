import { useLoaderData, useLocation } from "react-router";
import { dict, withLang } from "../lib/i18n.js";
import PortalIcon from "./PortalIcon.jsx";

const displayName = user => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.companyName || user?.email || "Firmenkonto";
const initials = user => ((user?.firstName?.[0] || user?.companyName?.[0] || "K") + (user?.lastName?.[0] || "")).toUpperCase();

export default function PortalLayout({ children, title, subtitle, orderNowHref, orderNowOnClick }) {
  const location = useLocation();
  const data = useLoaderData() || {};
  const locale = data.locale || new URLSearchParams(location.search).get("lang") || "de";
  const user = data.user || {};
  const t = dict[locale] || dict.de;
  const nav = [
    { href: "/dashboard", label: t.account || "Übersicht", icon: "dashboard" },
    { href: "/bestellungen", label: t.ordersTitle || "Bestellungen", icon: "orders" },
    { href: "/rechnungen", label: t.invoices || "Rechnungen", icon: "invoices" },
    { href: "/rechnungsadresse", label: t.billingAddressNav || "Rechnungsadresse", icon: "billing" },
    { href: "/lieferadressen", label: t.shippingAddressesNav || "Lieferadressen", icon: "address" },
    { href: "/kostenstellen", label: t.costCentersNav || "Kostenstellen", icon: "costs" },
  ].map(item => ({...item, url: withLang(item.href, locale), active: location.pathname === item.href || location.pathname.startsWith(item.href + "/") }));

  const orderHref = orderNowHref || "https://letmebowl-catering.de/pages/bestellen";
  const languageHref = newLocale => {
    const qs = new URLSearchParams(location.search);
    qs.set("lang", newLocale);
    return location.pathname + "?" + qs.toString();
  };
  const OrderNow = ({ className = "" }) => orderNowOnClick
    ? <button type="button" className={"lmb-primary-action " + className} onClick={orderNowOnClick}><PortalIcon name="plus" size={18}/>{t.orderNow || "Jetzt bestellen"}</button>
    : <a href={orderHref} className={"lmb-primary-action " + className}><PortalIcon name="plus" size={18}/>{t.orderNow || "Jetzt bestellen"}</a>;

  return (
    <div className="lmb-unified-shell lmb-unified-shell--customer">
      <aside className="lmb-unified-sidebar" aria-label={locale === "en" ? "Account navigation" : "Kontonavigation"}>
        <a href="https://letmebowl-catering.de" className="lmb-shell-brand" aria-label="Let Me Bowl Onlineshop">
          <img src="/brand/let-me-bowl-logo.webp" width="56" height="48" alt="" />
          <span className="lmb-shell-brand-copy"><strong>LET ME BOWL</strong><small>{locale === "en" ? "CUSTOMER ACCOUNT" : "FIRMENKUNDENPORTAL"}</small></span>
        </a>
        <div className="lmb-sidebar-customer">
          <div className="lmb-sidebar-avatar">{initials(user)}</div>
          <div><strong>{displayName(user)}</strong><small>{user?.companyName || user?.email || ""}</small></div>
        </div>
        <p className="lmb-sidebar-label">{locale === "en" ? "Your workspace" : "Ihr Firmenkonto"}</p>
        <nav className="lmb-unified-sidebar-nav">
          {nav.map(item => <a href={item.url} key={item.href} aria-current={item.active ? "page" : undefined} className={"lmb-unified-nav-link" + (item.active ? " is-active" : "")}>
            <PortalIcon name={item.icon}/><span>{item.label}</span>
          </a>)}
        </nav>
        <div className="lmb-unified-sidebar-bottom">
          <OrderNow />
          <a href={withLang("/logout",locale)} className="lmb-unified-nav-link lmb-logout-link"><PortalIcon name="logout"/><span>{t.logout || "Abmelden"}</span></a>
        </div>
      </aside>

      <div className="lmb-unified-workspace">
        <header className="lmb-unified-toolbar">
          <a href="https://letmebowl-catering.de" className="lmb-toolbar-brand lmb-shell-brand" aria-label="Let Me Bowl Onlineshop">
            <img src="/brand/let-me-bowl-logo.webp" width="50" height="44" alt="" />
            <span className="lmb-shell-brand-copy"><strong>LET ME BOWL</strong><small>{locale === "en" ? "CUSTOMER ACCOUNT" : "FIRMENKUNDENPORTAL"}</small></span>
          </a>
          <div className="lmb-toolbar-trail"><span>Let Me Bowl</span><span aria-hidden="true">/</span><strong>{locale === "en" ? "Account" : "Kundenkonto"}</strong></div>
          <div className="lmb-toolbar-account">
            <nav className="lmb-language-switch" aria-label={locale === "en" ? "Language" : "Sprache"}>
              <a href={languageHref("de")} aria-current={locale === "de" ? "page" : undefined}>DE</a>
              <a href={languageHref("en")} aria-current={locale === "en" ? "page" : undefined}>EN</a>
            </nav>
            <span className="lmb-toolbar-avatar" aria-hidden="true">{initials(user)}</span>
            <a href={withLang("/logout",locale)} className="lmb-toolbar-logout" aria-label={t.logout || "Abmelden"}><PortalIcon name="logout"/></a>
          </div>
        </header>
        <main className="lmb-unified-main" id="main-content">
          <div className="lmb-page-intro">
            <div><p className="lmb-overline">{locale === "en" ? "LET ME BOWL / CUSTOMER ACCOUNT" : "LET ME BOWL / FIRMENKONTO"}</p><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
            <OrderNow className="lmb-intro-action"/>
          </div>
          <nav className="lmb-customer-mobile-tabs" aria-label={locale === "en" ? "Account sections" : "Kontobereiche"}>
            {nav.map(item => <a href={item.url} key={item.href} aria-current={item.active ? "page" : undefined} className={"lmb-mobile-section" + (item.active ? " is-active" : "")}>
              <PortalIcon name={item.icon} size={18}/><span>{item.label}</span>
            </a>)}
          </nav>
          <div className="lmb-unified-page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
