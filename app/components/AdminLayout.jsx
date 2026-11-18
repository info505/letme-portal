import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { withLang } from "../lib/i18n.js";
import PortalBrand from "./PortalBrand.jsx";
import PortalIcon from "./PortalIcon.jsx";
import LanguageSwitch from "./LanguageSwitch.jsx";

export default function AdminLayout({ title, subtitle, user, children }) {
  const location = useLocation();
  const locale = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "de";
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const items = [
    ["/admin", "Dashboard", "home"],
    ["/admin/orders", locale === "en" ? "Orders" : "Bestellungen", "orders"],
    ["/admin/customers", locale === "en" ? "Company customers" : "Firmenkunden", "users"],
    ["/admin/invoices", locale === "en" ? "Invoices" : "Rechnungen", "invoice"],
  ];
  return <div className="lmb-portal-shell lmb-portal-admin">
    <aside className="lmb-portal-sidebar">
      <PortalBrand subtitle={locale === "en" ? "Customer administration" : "Kundenverwaltung"} />
      <button className="lmb-portal-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="lmb-admin-navigation" onClick={() => setMenuOpen(!menuOpen)}><span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>{locale === "en" ? "Menu" : "Menü"}<span className="lmb-portal-menu-page">{title}</span></button>
      <div id="lmb-admin-navigation" className={`lmb-portal-navigation${menuOpen ? " is-open" : ""}`}>
        <a className="lmb-portal-cockpit-link" href="https://letmebowl-shop-staging.up.railway.app/cockpit/kundenkonto"><PortalIcon name="arrow" /><span>{locale === "en" ? "Central administration" : "Zentrale Verwaltung"}<small>{locale === "en" ? "Open the Let Me Bowl Cockpit" : "Zum Let Me Bowl Cockpit"}</small></span></a>
        <p className="lmb-portal-nav-heading">{locale === "en" ? "Customer portal" : "Kundenportal"}</p>
        <nav aria-label={locale === "en" ? "Customer administration" : "Kundenverwaltung"}>
          {items.map(([href, label, icon]) => <a className="lmb-portal-nav-link" key={href} href={withLang(href, locale)} aria-current={(href === "/admin" ? location.pathname === href : location.pathname.startsWith(href) || (href === "/admin/customers" && location.pathname.startsWith("/admin/customer-detail"))) ? "page" : undefined}><PortalIcon name={icon} /><span>{label}</span></a>)}
        </nav>
        <div className="lmb-portal-sidebar-bottom"><div className="lmb-portal-user"><span className="lmb-portal-avatar" aria-hidden="true">{(user?.firstName?.[0] || "L").toUpperCase()}</span><div><strong>{user?.firstName || "Let Me Bowl"}</strong><small>{user?.email || (locale === "en" ? "Administration" : "Verwaltung")}</small></div></div><a className="lmb-portal-logout" href={withLang("/logout", locale)}><PortalIcon name="logout" />{locale === "en" ? "Sign out" : "Abmelden"}</a></div>
      </div>
    </aside>
    <main className="lmb-portal-main" id="portal-content"><header className="lmb-portal-page-head"><div><p className="lmb-portal-eyebrow">Let Me Bowl · {locale === "en" ? "Customer administration" : "Kundenverwaltung"}</p><h1>{title}</h1>{subtitle && <p className="lmb-portal-subtitle">{subtitle}</p>}</div><LanguageSwitch /></header><div className="lmb-portal-content">{children}</div></main>
  </div>;
}
