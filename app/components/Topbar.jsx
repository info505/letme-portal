import { useLoaderData, useLocation } from "react-router";
import LanguageSwitch from "./LanguageSwitch.jsx";
import PortalBrand from "./PortalBrand.jsx";
import { dict, withLang } from "../lib/i18n.js";

export default function Topbar() {
  const location = useLocation(), data = useLoaderData() || {};
  const locale = (data.locale || new URLSearchParams(location.search).get("lang")) === "en" ? "en" : "de";
  const t = dict[locale] || dict.de, user = data.user || null;
  return <header className="lmb-portal-topbar"><PortalBrand subtitle={locale === "en" ? "Your company account" : "Dein Firmenkonto"} /><nav aria-label={locale === "en" ? "Account navigation" : "Kontonavigation"}>
    <a href={withLang("/dashboard", locale)}>{t.account || "Konto"}</a><a href={withLang("/lieferadressen", locale)}>{t.addresses || "Adressen"}</a><a href={withLang("/rechnungen", locale)}>{t.invoices || "Rechnungen"}</a>
  </nav><LanguageSwitch />{user && <a href={withLang("/logout", locale)}>{t.logout || "Abmelden"}</a>}</header>;
}
