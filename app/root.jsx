import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router";
import portalStyles from "./styles/letmebowl-portal.css?url";

export const links = () => [{ rel: "stylesheet", href: portalStyles }, { rel: "icon", type: "image/webp", href: "/brand/let-me-bowl-logo.webp" }];

export default function App() {
  const location = useLocation();
  const locale = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "de";
  const route = location.pathname.startsWith("/admin/orders/") ? "admin-orders-detail" : location.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9-]/g, "-") || "home";
  return <html lang={locale}><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="robots" content="noindex, nofollow, noarchive" /><meta name="theme-color" content="#234c30" /><title>{locale === "en" ? "Your company account | Let Me Bowl" : "Dein Firmenkonto | Let Me Bowl"}</title><Meta /><Links /></head>
    <body className={`lmb-portal-app lmb-route-${route}`}><a className="lmb-portal-skip" href="#portal-content">{locale === "en" ? "Skip to content" : "Zum Inhalt"}</a><Outlet /><ScrollRestoration /><Scripts /></body>
  </html>;
}
