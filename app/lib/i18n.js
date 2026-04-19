export function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  return url.searchParams.get("lang") || "de";
}

export function withLang(path, lang) {
  return `${path}?lang=${lang}`;
}

export const dict = {
  de: {
    brand: "Let Me Bowl",

    welcome: "Willkommen",
    account: "Konto",
    ordersTitle: "Bestellungen",
    addresses: "Adressen",
    billingAddressNav: "Rechnungsadresse",
    shippingAddressesNav: "Lieferadressen",
    costCentersNav: "Kostenstellen",
    invoices: "Rechnungen",
    orderNow: "Jetzt bestellen",
    logout: "Abmelden",
    homepage: "Zur Website",

    // LOGIN
    loginTitle: "Anmelden",
    loginText: "Zugang zu deinem Firmenkonto",
    loginField: "E-Mail oder Benutzername",
    loginPlaceholder: "z. B. firma-berlin",
    password: "Passwort",
    passwordPlaceholder: "Dein Passwort",
    signInNow: "Einloggen",
    signingIn: "Wird eingeloggt...",
    forgotPassword: "Passwort vergessen?",
    noAccountYet: "Noch kein Konto?",
    registerNow: "Jetzt registrieren",

    // REGISTER (NEU & BESSER)
    registerTitle: "Firmenkonto erstellen",
    registerText:
      "Erstelle den ersten Zugang für dein Unternehmen und verwalte Bestellungen, Rechnungen, Lieferadressen und weitere Mitarbeitende zentral an einem Ort.",
    registerSubmitting: "Wird erstellt...",
    alreadyRegistered: "Bereits registriert?",
    loginNow: "Jetzt anmelden",

    registerBadgeBusiness: "Für Firmenkunden",
    registerIntroTitle: "Erster Firmenzugang",
    registerIntroText:
      "Lege den ersten Admin-Zugang für dein Unternehmen an. Weitere Mitarbeitende können später hinzugefügt werden.",

    registerSectionCompany: "Firma",
    registerSectionContact: "Ansprechpartner",
    registerSectionAccess: "Zugang",

    registerBenefits1:
      "Zentraler Firmenzugang für Team-Bestellungen",
    registerBenefits2:
      "Liefer- und Rechnungsadressen übersichtlich verwalten",
    registerBenefits3:
      "Vorbereitet für Rechnungen, Bestellhistorie und B2B-Prozesse",

    registerPanelText:
      "Richte deinen Firmenzugang in wenigen Schritten ein.",

    usernameHelp:
      "Jeder Mitarbeitende kann später einen eigenen Benutzernamen erhalten.",

    registerFillRequired: "Bitte fülle alle Pflichtfelder aus.",
    registerEmailInvalid: "Bitte gib eine gültige E-Mail-Adresse ein.",
    registerUsernameShort: "Der Benutzername muss mindestens 3 Zeichen haben.",
    registerPasswordShort: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    registerPasswordMismatch: "Die Passwörter stimmen nicht überein.",
    registerUserExists: "E-Mail oder Benutzername ist bereits vergeben.",

    company: "Firma",
    companyPlaceholder: "z. B. Musterfirma GmbH",
    firstName: "Vorname",
    firstNamePlaceholder: "Vorname",
    lastName: "Nachname",
    lastNamePlaceholder: "Nachname",
    username: "Benutzername",
    usernamePlaceholder: "z. B. maria-office oder firma-berlin",
    email: "E-Mail",
    emailPlaceholder: "name@firma.de",
    phone: "Telefon",
    phonePlaceholder: "+49 ...",
    passwordRegisterPlaceholder: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort wiederholen",
    confirmPasswordPlaceholder: "Passwort wiederholen",

    // DASHBOARD
    accountText:
      "Verwalte deine Kontodaten, Rechnungen, Bestellungen und Lieferadressen zentral an einem Ort.",
    addressesText: "Verwalte deine Liefer- und Rechnungsadressen.",
    invoicesText: "Übersicht über alle Rechnungen und Zahlungen.",
    orderNowText: "Starte direkt eine neue Bestellung.",
    openAddresses: "Adressen öffnen",
    openInvoices: "Rechnungen öffnen",
    startOrder: "Bestellung starten",

    // ADDRESSES
    billingAddressTitle: "Rechnungsadresse",
    billingAddressText:
      "Verwalte hier deine Rechnungsdaten für Angebote und Abrechnung.",
    shippingAddressesTitle: "Lieferadressen",
    shippingAddressesText:
      "Verwalte deine gespeicherten Lieferorte für zukünftige Bestellungen.",
    shippingAddressesFormText:
      "Verwalte hier deine Lieferorte und Firmenstandorte.",
    billingAddress: "Rechnungsadresse",
    shippingAddresses: "Lieferadressen",
    noShippingAddress: "Noch keine Lieferadresse vorhanden.",

    defaultAddress: "Standardadresse",
    setAsDefault: "Als Standard setzen",
    billingUpdated: "Rechnungsadresse wurde gespeichert.",
    deliveryCreated: "Lieferadresse wurde gespeichert.",
    deliveryUpdated: "Lieferadresse wurde aktualisiert.",
    deliveryDeleted: "Lieferadresse wurde gelöscht.",
    deliveryDefaultUpdated: "Standard-Lieferadresse wurde aktualisiert.",
    addressFormError: "Bitte fülle die Pflichtfelder aus.",

    street: "Straße",
    streetPlaceholder: "Straßenname",
    houseNumber: "Hausnummer",
    houseNumberPlaceholder: "z. B. 12A",
    postalCode: "PLZ",
    postalCodePlaceholder: "z. B. 12345",
    city: "Stadt",
    cityPlaceholder: "Berlin",
    country: "Land",
    countryPlaceholder: "Deutschland",
    notes: "Hinweise",
    notesPlaceholder: "z. B. 3. Etage, Empfang im EG",
    label: "Bezeichnung",
    labelPlaceholder: "z. B. Büro, HQ, Lager",
    invoiceEmail: "Rechnungs-E-Mail",
    vatId: "USt-IdNr.",
    addDeliveryTitle: "Neue Lieferadresse",
    editDeliveryTitle: "Lieferadresse bearbeiten",
    existingDeliveryAddresses: "Gespeicherte Lieferadressen",
    noDeliverySaved:
      "Sobald du eine Lieferadresse anlegst, erscheint sie hier.",
    addShipping: "Lieferadresse speichern",
    contactPerson: "Ansprechpartner",
    contactPersonPlaceholder: "z. B. Max Mustermann",

    // ORDERS
    ordersText:
      "Hier findest du deine bisherigen und aktuellen Bestellungen.",
    orderNumber: "Bestellung",
    orderType: "Typ",
    reorderTitle: "Erneut bestellen",
    reorderText:
      "Starte schnell eine neue Bestellung auf Basis deiner bisherigen Anfragen.",
    positions: "Positionen",

    // INVOICES
    invoiceText:
      "Hier findest du alle Rechnungen und den aktuellen Zahlungsstatus.",
    statusNow: "Aktueller Stand",
    invoiceNumber: "Rechnung",
    date: "Datum",
    status: "Status",
    amount: "Betrag",
    paid: "Bezahlt",
    open: "Offen",

    // COST CENTERS
    costCentersTitle: "Kostenstellen",
    costCentersText:
      "Verwalte Kostenstellen für interne Zuordnung und Bestellungen.",
    addCostCenter: "Kostenstelle hinzufügen",
    noCostCenters: "Noch keine Kostenstellen vorhanden.",
    costCenterName: "Name",
    costCenterNamePlaceholder: "z. B. Marketing, Office Berlin",
    costCenterCode: "Code",
    costCenterCodePlaceholder: "z. B. MKT-01",

    // AUTH ERRORS
    loginFieldsMissing: "Bitte gib Benutzername und Passwort ein.",
    userNotFound: "Benutzer nicht gefunden.",
    accessDisabled: "Zugang ist deaktiviert.",
    passwordWrong: "Falsches Passwort.",

    // COMMON
    save: "Speichern",
    saving: "Wird gespeichert...",
    delete: "Löschen",
    edit: "Bearbeiten",
    cancel: "Abbrechen",
    saveChanges: "Änderungen speichern",

    generalError: "Etwas ist schiefgelaufen.",
  },

  en: {
    brand: "Let Me Bowl",

    welcome: "Welcome",
    account: "Account",
    ordersTitle: "Orders",
    addresses: "Addresses",
    billingAddressNav: "Billing address",
    shippingAddressesNav: "Delivery addresses",
    costCentersNav: "Cost centers",
    invoices: "Invoices",
    orderNow: "Order now",
    logout: "Logout",
    homepage: "Website",

    // LOGIN
    loginTitle: "Login",
    loginText: "Access your business account",
    loginField: "Email or username",
    loginPlaceholder: "e.g. company-berlin",
    password: "Password",
    passwordPlaceholder: "Your password",
    signInNow: "Sign in",
    signingIn: "Signing in...",
    forgotPassword: "Forgot password?",
    noAccountYet: "No account yet?",
    registerNow: "Register now",

    // REGISTER
    registerTitle: "Create company account",
    registerText:
      "Create the first access for your company and manage orders, invoices, delivery addresses and team members in one place.",
    registerSubmitting: "Creating...",
    alreadyRegistered: "Already registered?",
    loginNow: "Sign in now",

    registerBadgeBusiness: "For business customers",
    registerIntroTitle: "First company access",
    registerIntroText:
      "Create the first admin access for your company. Additional team members can be added later.",

    registerSectionCompany: "Company",
    registerSectionContact: "Contact person",
    registerSectionAccess: "Access",

    registerBenefits1:
      "Central company access for team orders",
    registerBenefits2:
      "Manage delivery and billing addresses clearly",
    registerBenefits3:
      "Prepared for invoices and order history",

    registerPanelText:
      "Set up your company access in just a few steps.",

    usernameHelp:
      "Each team member can later receive their own username.",

    registerFillRequired: "Please fill in all required fields.",
    registerEmailInvalid: "Please enter a valid email.",
    registerUsernameShort: "Username must be at least 3 characters.",
    registerPasswordShort: "Password must be at least 8 characters.",
    registerPasswordMismatch: "Passwords do not match.",
    registerUserExists: "Email or username already exists.",

    company: "Company",
    companyPlaceholder: "e.g. Example Ltd.",
    firstName: "First name",
    lastName: "Last name",
    username: "Username",
    usernamePlaceholder: "e.g. maria-office or company-berlin",
    email: "Email",
    phone: "Phone",
    passwordRegisterPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm password",

    generalError: "Something went wrong.",
  },
};