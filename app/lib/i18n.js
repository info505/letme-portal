export function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");

  if (lang === "en") return "en";
  return "de";
}

export function withLang(path, locale) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${locale}`;
}

export const dict = {
  de: {
    brand: "Let Me Bowl Catering",
    menu: "Menü",
    account: "Konto",
    invoices: "Rechnungen",
    addresses: "Adressen",
    costCenters: "Kostenstellen",
    logout: "Abmelden",
    homepage: "Startseite",
    orderNow: "Bestellen",
    welcome: "Willkommen",
    company: "Firma",
    username: "Benutzername",
    email: "E-Mail",
    phone: "Telefon",
    language: "Sprache",
    german: "Deutsch",
    english: "Englisch",
    accountText:
      "Hier verwaltest du dein Firmenkonto, Kontaktdaten und später auch Rechnungen und Lieferadressen.",
  },

  en: {
    brand: "Let Me Bowl Catering",
    menu: "Menu",
    account: "Account",
    invoices: "Invoices",
    addresses: "Addresses",
    costCenters: "Cost centers",
    logout: "Log out",
    homepage: "Homepage",
    orderNow: "Order now",
    welcome: "Welcome",
    company: "Company",
    username: "Username",
    email: "Email",
    phone: "Phone",
    language: "Language",
    german: "German",
    english: "English",
    accountText:
      "Manage your company account, contact details and later also invoices and delivery addresses here.",
  },
};