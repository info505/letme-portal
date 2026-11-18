import { useEffect, useState } from "react";
import { useLoaderData, useLocation } from "react-router";
import { dict, withLang } from "../lib/i18n.js";
import PortalBrand from "./PortalBrand.jsx";
import PortalIcon from "./PortalIcon.jsx";
import LanguageSwitch from "./LanguageSwitch.jsx";

export default function PortalLayout({ children, title, subtitle, orderNowHref, orderNowOnClick }) {
  const location = useLocation();
  const data = useLoaderData() || {};
  const locale = (data.locale || new URLSearchParams(location.search).get("lang")) === "en" ? "en" : "de";
  const t = dict[locale] || dict.de;
  const user = data.user || null;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.companyName || user?.email || (locale === "en" ? "Your account" : "Dein Konto");
  const nav = [
    ["/dashboard", locale === "en" ? "Overview" : "Übersicht", "home"],
    ["/bestellungen", locale === "en" ? "Orders" : "Bestellungen", "orders"],
    ["/rechnungen", locale === "en" ? "Invoices" : "Rechnungen", "invoice"],
    ["/rechnungsadresse", locale === "en" ? "Billing details" : "Rechnungsdaten", "billing"],
    ["/lieferadressen", locale === "en" ? "Delivery addresses" : "Lieferadressen", "address"],
    ["/kostenstellen", locale === "en" ? "Cost centres" : "Kostenstellen", "cost"],
    ["/passwort-aendern", locale === "en" ? "Password & security" : "Passwort & Sicherheit", "lock"],
  ];
  const orderButton = orderNowOnClick
    ? <button className="lmb-portal-button" type="button" onClick={orderNowOnClick}><PortalIcon name="plus" />{t.orderNow || "Jetzt bestellen"}</button>
    : <a className="lmb-portal-button" href={orderNowHref || "https://letmebowl-catering.de/pages/bestellen"}><PortalIcon name="plus" />{t.orderNow || "Jetzt bestellen"}</a>;
  return <div className="lmb-portal-shell">
    <aside className="lmb-portal-sidebar">
      <PortalBrand subtitle={locale === "en" ? "Your company account" : "Dein Firmenkonto"} />
      <button className="lmb-portal-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="lmb-portal-navigation" onClick={() => setMenuOpen(!menuOpen)}>
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>{locale === "en" ? "Account menu" : "Kontomenü"}<span className="lmb-portal-menu-page">{title}</span>
      </button>
      <div id="lmb-portal-navigation" className={`lmb-portal-navigation${menuOpen ? " is-open" : ""}`}>
        <p className="lmb-portal-nav-heading">{locale === "en" ? "Your account" : "Dein Konto"}</p>
        <nav aria-label={locale === "en" ? "Customer account" : "Kundenkonto"}>
          {nav.map(([path, label, icon]) => <a key={path} href={withLang(path, locale)} className="lmb-portal-nav-link" aria-current={location.pathname === path || location.pathname.startsWith(`${path}/`) ? "page" : undefined}>
            <PortalIcon name={icon} /><span>{label}</span>
          </a>)}
          {user?.isAdmin && <a className="lmb-portal-nav-link" href="https://letmebowl-shop-staging.up.railway.app/cockpit/kundenkonto"><PortalIcon name="users" /><span>{locale === "en" ? "Central administration" : "Zentrale Verwaltung"}</span></a>}
        </nav>
        <div className="lmb-portal-sidebar-bottom">
          <div className="lmb-portal-user"><span className="lmb-portal-avatar" aria-hidden="true">{(user?.firstName?.[0] || user?.companyName?.[0] || "L").toUpperCase()}{(user?.lastName?.[0] || "").toUpperCase()}</span><div><strong>{displayName}</strong><small>{user?.companyName || (locale === "en" ? "Let Me Bowl customer" : "Let Me Bowl Kunde")}</small></div></div>
          {orderButton}
          <a className="lmb-portal-logout" href={withLang("/logout", locale)}><PortalIcon name="logout" />{t.logout || "Abmelden"}</a>
        </div>
      </div>
    </aside>
    <main className="lmb-portal-main" id="portal-content">
      <header className="lmb-portal-page-head"><div><p className="lmb-portal-eyebrow">{locale === "en" ? "Let Me Bowl · company account" : "Let Me Bowl · Firmenkonto"}</p><h1>{title}</h1>{subtitle && <p className="lmb-portal-subtitle">{subtitle}</p>}</div><LanguageSwitch /></header>
      <div className="lmb-portal-content">{children}</div>
      <footer className="lmb-portal-footer"><span>{locale === "en" ? "Good food. Well organised." : "Gutes Essen. Gut organisiert."}</span><a href="mailto:info@letmebowl-catering.de">{locale === "en" ? "Need a hand? Contact us" : "Fragen? Wir helfen dir"}</a><a href="https://letmebowl-catering.de/policies/privacy-policy">{locale === "en" ? "Privacy" : "Datenschutz"}</a></footer>
    </main>
  </div>;
}
