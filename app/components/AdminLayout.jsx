import { useLocation } from "react-router";
import PortalIcon from "./PortalIcon.jsx";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", isActive: path => path === "/admin" },
  { href: "/admin/orders", label: "Bestellungen", icon: "orders", isActive: path => path.startsWith("/admin/orders") },
  { href: "/admin/customers", label: "Kunden", icon: "users", isActive: path => path.startsWith("/admin/customers") || path.startsWith("/admin/customer-detail") },
  { href: "/admin/invoices", label: "Rechnungen", icon: "invoices", isActive: path => path.startsWith("/admin/invoices") },
];

function Brand({ compact = false }) {
  return (
    <a href="https://letmebowl-catering.de" className={"lmb-shell-brand" + (compact ? " is-compact" : "")} aria-label="Let Me Bowl Onlineshop">
      <img src="/brand/let-me-bowl-logo.webp" width="56" height="48" alt="" />
      <span className="lmb-shell-brand-copy"><strong>LET ME BOWL</strong><small>PORTAL / VERWALTUNG</small></span>
    </a>
  );
}

export default function AdminLayout({ title, subtitle, user, children }) {
  const { pathname } = useLocation();
  const nav = navigation.map(item => ({ ...item, active: item.isActive(pathname) }));
  return (
    <div className="lmb-unified-shell lmb-unified-shell--admin">
      <aside className="lmb-unified-sidebar" aria-label="Verwaltungsnavigation">
        <Brand />
        <p className="lmb-sidebar-label">Arbeitsbereiche</p>
        <nav className="lmb-unified-sidebar-nav">
          {nav.map(item => <a href={item.href} key={item.href} aria-current={item.active ? "page" : undefined} className={"lmb-unified-nav-link" + (item.active ? " is-active" : "")}>
            <PortalIcon name={item.icon} /><span>{item.label}</span>
          </a>)}
        </nav>
        <div className="lmb-unified-sidebar-bottom">
          <div className="lmb-sidebar-assist"><PortalIcon name="lock" size={18} /><span>Geschützter Verwaltungsbereich</span></div>
          <a href="/logout" className="lmb-unified-nav-link lmb-logout-link"><PortalIcon name="logout" /><span>Abmelden</span></a>
        </div>
      </aside>
      <div className="lmb-unified-workspace">
        <header className="lmb-unified-toolbar">
          <div className="lmb-toolbar-brand"><Brand compact /></div>
          <div className="lmb-toolbar-trail"><span>Let Me Bowl</span><span aria-hidden="true">/</span><strong>Verwaltung</strong></div>
          <div className="lmb-toolbar-account">
            <span className="lmb-toolbar-avatar" aria-hidden="true">{(user?.firstName || user?.email || "A").slice(0, 1).toUpperCase()}</span>
            <span className="lmb-toolbar-account-text"><strong>Admin</strong><small>{user?.email || "Kundenportal"}</small></span>
            <a href="/logout" className="lmb-toolbar-logout" aria-label="Abmelden"><PortalIcon name="logout" /></a>
          </div>
        </header>
        <main className="lmb-unified-main" id="main-content">
          <div className="lmb-page-intro">
            <div><p className="lmb-overline">LET ME BOWL / KUNDENPORTAL</p><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
          </div>
          <div className="lmb-unified-page-content">{children}</div>
        </main>
        <nav className="lmb-mobile-tabbar" aria-label="Hauptnavigation">
          {nav.map(item => <a key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={"lmb-mobile-tab" + (item.active ? " is-active" : "")}>
            <PortalIcon name={item.icon} size={20}/><span>{item.label}</span>
          </a>)}
        </nav>
      </div>
    </div>
  );
}
