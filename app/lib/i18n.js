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

    invoiceTitle: "Rechnungen",
    invoiceText:
      "Hier werden später deine Rechnungen, Zahlungsstände und Downloads angezeigt.",
    statusNow: "Aktueller Status",
    invoiceNumber: "Rechnungsnr.",
    date: "Datum",
    status: "Status",
    amount: "Betrag",
    paid: "Bezahlt",
    open: "Offen",

    addressTitle: "Adressen",
    addressText:
      "Hier kannst du später Rechnungsadresse und Lieferadressen verwalten.",
    billingAddress: "Rechnungsadresse",
    shippingAddresses: "Lieferadressen",
    editBilling: "Rechnungsdaten bearbeiten",
    addShipping: "Neue Lieferadresse anlegen",
    noShippingAddress: "Noch keine echte Lieferadresse hinterlegt.",

    loginTitle: "Anmelden",
    loginText:
      "Zugriff auf dein Firmenkonto, Bestellungen, Rechnungsdaten und Lieferadressen.",
    loginField: "Benutzername oder E-Mail",
    loginPlaceholder: "z. B. firma-berlin oder name@firma.de",
    password: "Passwort",
    passwordPlaceholder: "Dein Passwort",
    forgotPassword: "Passwort vergessen?",
    noAccountYet: "Noch kein Konto?",
    registerNow: "Jetzt registrieren",
    signInNow: "Jetzt anmelden",
    signingIn: "Anmeldung läuft...",

    registerTitle: "Konto erstellen",
    registerText:
      "Firmenzugang für Bestellungen, Rechnungsdaten und Lieferadressen.",
    firstName: "Vorname",
    lastName: "Nachname",
    fullName: "Ansprechpartner",
    companyName: "Firmenname",
    registerUsernamePlaceholder: "z. B. firma-berlin",
    registerPhonePlaceholder: "+49 ...",
    registerEmailPlaceholder: "name@firma.de",
    registerPasswordPlaceholder: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort wiederholen",
    confirmPasswordPlaceholder: "Passwort wiederholen",
    createAccount: "Jetzt registrieren",
    creatingAccount: "Wird erstellt...",
    alreadyRegistered: "Bereits registriert?",
    signInHere: "Jetzt anmelden",

    forgotPasswordTitle: "Passwort vergessen",
    forgotPasswordText: "Diese Funktion bauen wir im nächsten Schritt.",
    backToLogin: "Zurück zum Login",

    contactPerson: "Ansprechpartner",
    nextStepHint:
      "Als Nächstes bauen wir Formular, Speichern und Bearbeiten direkt mit Datenbankanbindung.",

    userNotFound: "Benutzer nicht gefunden.",
    accessDisabled: "Dein Zugang ist aktuell deaktiviert.",
    passwordWrong: "Das Passwort ist nicht korrekt.",
    loginFieldsMissing:
      "Bitte gib Benutzername oder E-Mail und dein Passwort ein.",
    registerFieldsMissing: "Bitte fülle alle Pflichtfelder aus.",
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    usernameTooShort:
      "Der Benutzername muss mindestens 3 Zeichen haben.",
    passwordTooShort:
      "Das Passwort muss mindestens 8 Zeichen lang sein.",
    passwordsNoMatch: "Die Passwörter stimmen nicht überein.",
    userAlreadyExists:
      "E-Mail oder Benutzername ist bereits vergeben.",
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

    invoiceTitle: "Invoices",
    invoiceText:
      "Your invoices, payment status and downloads will appear here later.",
    statusNow: "Current status",
    invoiceNumber: "Invoice no.",
    date: "Date",
    status: "Status",
    amount: "Amount",
    paid: "Paid",
    open: "Open",

    addressTitle: "Addresses",
    addressText:
      "Here you will later manage your billing address and delivery addresses.",
    billingAddress: "Billing address",
    shippingAddresses: "Delivery addresses",
    editBilling: "Edit billing details",
    addShipping: "Add new delivery address",
    noShippingAddress: "No real delivery address has been stored yet.",

    loginTitle: "Sign in",
    loginText:
      "Access your company account, orders, billing details and delivery addresses.",
    loginField: "Username or email",
    loginPlaceholder: "e.g. company-berlin or name@company.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    forgotPassword: "Forgot password?",
    noAccountYet: "No account yet?",
    registerNow: "Register now",
    signInNow: "Sign in now",
    signingIn: "Signing in...",

    registerTitle: "Create account",
    registerText:
      "Company access for orders, billing details and delivery addresses.",
    firstName: "First name",
    lastName: "Last name",
    fullName: "Contact person",
    companyName: "Company name",
    registerUsernamePlaceholder: "e.g. company-berlin",
    registerPhonePlaceholder: "+49 ...",
    registerEmailPlaceholder: "name@company.com",
    registerPasswordPlaceholder: "At least 8 characters",
    confirmPassword: "Repeat password",
    confirmPasswordPlaceholder: "Repeat password",
    createAccount: "Register now",
    creatingAccount: "Creating account...",
    alreadyRegistered: "Already registered?",
    signInHere: "Sign in now",

    forgotPasswordTitle: "Forgot password",
    forgotPasswordText: "We will build this feature in the next step.",
    backToLogin: "Back to login",

    contactPerson: "Contact person",
    nextStepHint:
      "Next we will build form, save and edit directly with database connection.",

    userNotFound: "User not found.",
    accessDisabled: "Your account is currently disabled.",
    passwordWrong: "The password is incorrect.",
    loginFieldsMissing:
      "Please enter your username or email and your password.",
    registerFieldsMissing: "Please fill in all required fields.",
    invalidEmail: "Please enter a valid email address.",
    usernameTooShort:
      "The username must be at least 3 characters long.",
    passwordTooShort:
      "The password must be at least 8 characters long.",
    passwordsNoMatch: "The passwords do not match.",
    userAlreadyExists:
      "Email or username is already in use.",
  },
};