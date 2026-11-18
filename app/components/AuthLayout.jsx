import PortalBrand from "./PortalBrand.jsx";
import LanguageSwitch from "./LanguageSwitch.jsx";

export default function AuthLayout({ locale = "de", title, intro, children }) {
  const en = locale === "en";
  return <div className="lmb-auth-page">
    <header className="lmb-auth-header"><PortalBrand subtitle={en ? "Your company account" : "Dein Firmenkonto"} /><LanguageSwitch /></header>
    <main id="portal-content" className="lmb-auth-layout">
      <section className="lmb-auth-story" aria-label={en ? "Welcome to Let Me Bowl" : "Willkommen bei Let Me Bowl"}>
        <div className="lmb-auth-story-copy"><p className="lmb-portal-eyebrow">LET ME BOWL · CATERING BERLIN</p><h2>{en ? "Good food." : "Gutes Essen."}<em>{en ? "Made simple." : "Einfach organisiert."}</em></h2><p>{en ? "Your orders, invoices and company details, all in one place. More time for your team — we take care of the food." : "Bestellungen, Rechnungen und Firmendaten an einem Ort. Mehr Zeit für dein Team — wir kümmern uns ums Essen."}</p><ul><li>{en ? "Keep track of your orders" : "Bestellungen im Blick behalten"}</li><li>{en ? "Manage addresses and cost centres" : "Adressen und Kostenstellen verwalten"}</li><li>{en ? "Access your invoices" : "Rechnungen bequem abrufen"}</li></ul></div>
        <figure><img src="/brand/catering-table.webp" alt={en ? "A table set with colourful bowls and wraps" : "Gedeckter Tisch mit bunten Bowls und Wraps"} width="640" height="427" /><figcaption>{en ? "Serving suggestion" : "Serviervorschlag"}</figcaption></figure>
      </section>
      <section className="lmb-auth-card"><p className="lmb-portal-eyebrow">{en ? "YOUR LET ME BOWL ACCOUNT" : "DEIN LET ME BOWL KONTO"}</p><h1>{title}</h1>{intro && <p className="lmb-auth-intro">{intro}</p>}{children}<div className="lmb-auth-help"><strong>{en ? "Need a hand?" : "Brauchst du Hilfe?"}</strong><a href="mailto:info@letmebowl-catering.de">info@letmebowl-catering.de</a></div></section>
    </main>
    <footer className="lmb-auth-footer"><span>Let Me Bowl · {en ? "Catering for your team" : "Catering für dein Team"}</span><a href="https://letmebowl-catering.de/policies/privacy-policy">{en ? "Privacy" : "Datenschutz"}</a><a href="https://letmebowl-catering.de/policies/legal-notice">{en ? "Legal notice" : "Impressum"}</a></footer>
  </div>;
}
