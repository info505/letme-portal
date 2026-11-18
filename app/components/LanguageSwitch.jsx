import { useLocation } from "react-router";
export default function LanguageSwitch() {
  const location = useLocation();
  const current = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "de";
  function href(lang) { const params = new URLSearchParams(location.search); params.set("lang", lang); return `${location.pathname}?${params.toString()}`; }
  return <nav className="lmb-portal-language" aria-label={current === "en" ? "Language" : "Sprache"}>
    <a href={href("de")} lang="de" aria-current={current === "de" ? "true" : undefined}>DE</a>
    <a href={href("en")} lang="en" aria-current={current === "en" ? "true" : undefined}>EN</a>
  </nav>;
}
