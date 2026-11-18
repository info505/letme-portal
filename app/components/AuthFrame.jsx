import { useLocation } from "react-router";

export default function AuthFrame({ locale = "de", title, description, children, footer }) {
  const loc = useLocation();
  const languageHref = lang => {
    const q = new URLSearchParams(loc.search);
    q.set("lang", lang);
    return loc.pathname + "?" + q.toString();
  };
  return (
    <main className="lmb-auth-screen">
      <nav className="lmb-auth-language" aria-label="Sprache">
        <a href={languageHref("de")} aria-current={locale !== "en" ? "page" : undefined}>DE</a>
        <a href={languageHref("en")} aria-current={locale === "en" ? "page" : undefined}>EN</a>
      </nav>
      <section className="lmb-auth-card">
        <div className="lmb-auth-brand">
          <img src="/brand/let-me-bowl-logo.webp" alt="Let Me Bowl" width="80" height="76" />
          <span>LET ME BOWL / {locale === "en" ? "CUSTOMER ACCOUNT" : "KUNDENPORTAL"}</span>
        </div>
        <h1 className="lmb-auth-title">{title}</h1>
        <p className="lmb-auth-description">{description}</p>
        {children}
        <div className="lmb-auth-footnote">{footer || (locale === "en" ? "Protected company access" : "Geschützter Zugang für Firmenkunden")}</div>
      </section>
    </main>
  );
}
