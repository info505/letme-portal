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
    invoiceTitle: "Rechnungen",
    invoiceText:
      "Hier werden später deine Rechnungen, Zahlungsstände und Downloads angezeigt.",
    addressTitle: "Adressen",
    addressText:
      "Hier kannst du später Rechnungsadresse und Lieferadressen verwalten.",
    accountText:
      "Hier verwaltest du dein Firmenkonto, Kontaktdaten und später auch Rechnungen und Lieferadressen.",
    statusNow: "Aktueller Status",
    invoiceNumber: "Rechnungsnr.",
    date: "Datum",
    status: "Status",
    amount: "Betrag",
    paid: "Bezahlt",
    open: "Offen",
    billingAddress: "Rechnungsadresse",
    shippingAddresses: "Lieferadressen",
    editBilling: "Rechnungsdaten bearbeiten",
    addShipping: "Neue Lieferadresse anlegen",
    noShippingAddress: "Noch keine echte Lieferadresse hinterlegt.",
    costCenterTitle: "Kostenstellen",
    addCostCenter: "Neue Kostenstelle anlegen",
    noCostCenter: "Noch keine Kostenstelle angelegt.",
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
    invoiceTitle: "Invoices",
    invoiceText:
      "Your invoices, payment status and downloads will appear here later.",
    addressTitle: "Addresses",
    addressText:
      "Here you will later manage your billing address and delivery addresses.",
    accountText:
      "Manage your company account, contact details and later also invoices and delivery addresses here.",
    statusNow: "Current status",
    invoiceNumber: "Invoice no.",
    date: "Date",
    status: "Status",
    amount: "Amount",
    paid: "Paid",
    open: "Open",
    billingAddress: "Billing address",
    shippingAddresses: "Delivery addresses",
    editBilling: "Edit billing details",
    addShipping: "Add new delivery address",
    noShippingAddress: "No real delivery address has been stored yet.",
    costCenterTitle: "Cost centers",
    addCostCenter: "Add new cost center",
    noCostCenter: "No cost center has been created yet.",
  },
};