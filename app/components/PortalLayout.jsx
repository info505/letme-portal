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
    invoices: "Rechnungen",
    orderNow: "Jetzt bestellen",
    logout: "Abmelden",
    homepage: "Zur Website",

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

    registerTitle: "Konto erstellen",
    registerText:
      "Erstelle dein Firmenkonto für Bestellungen, Rechnungen und Lieferadressen.",
    registerSubmitting: "Wird erstellt...",
    alreadyRegistered: "Bereits registriert?",
    loginNow: "Jetzt anmelden",

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
    usernamePlaceholder: "z. B. firma-berlin",
    email: "E-Mail",
    emailPlaceholder: "name@firma.de",
    phone: "Telefon",
    phonePlaceholder: "+49 ...",
    passwordRegisterPlaceholder: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort wiederholen",
    confirmPasswordPlaceholder: "Passwort wiederholen",

    accountText:
      "Verwalte deine Kontodaten, Rechnungen, Bestellungen und Lieferadressen zentral an einem Ort.",
    addressesText: "Verwalte deine Liefer- und Rechnungsadressen.",
    invoicesText: "Übersicht über alle Rechnungen und Zahlungen.",
    orderNowText: "Starte direkt eine neue Bestellung.",
    openAddresses: "Adressen öffnen",
    openInvoices: "Rechnungen öffnen",
    startOrder: "Bestellung starten",

    billingAddressTitle: "Rechnungsadresse",
    billingAddressText:
      "Verwalte hier deine Rechnungsdaten für Angebote, Abrechnung und zukünftige Bestellungen.",
    shippingAddressesTitle: "Lieferadressen",
    shippingAddressesText:
      "Verwalte deine gespeicherten Lieferorte für zukünftige Catering-Bestellungen.",
    billingAddress: "Rechnungsadresse",
    shippingAddresses: "Lieferadressen",
    noShippingAddress: "Noch keine Lieferadresse vorhanden.",

    invoiceText:
      "Hier findest du alle Rechnungen und den aktuellen Zahlungsstatus.",
    statusNow: "Aktueller Stand",
    invoiceStatusTextStart: "Für",
    invoiceStatusTextEnd:
      "ist die Rechnungsübersicht vorbereitet. Als Nächstes binden wir echte Rechnungsdaten an.",
    invoiceNumber: "Rechnung",
    date: "Datum",
    status: "Status",
    amount: "Betrag",
    paid: "Bezahlt",
    open: "Offen",

    ordersText:
      "Hier findest du deine bisherigen und aktuellen Bestellungen übersichtlich an einem Ort.",
    orderNumber: "Bestellung",
    orderType: "Typ",
    reorderTitle: "Erneut bestellen",
    reorderText:
      "Starte schnell eine neue Bestellung auf Basis deiner bisherigen Catering-Anfragen.",
    positions: "Positionen",

    loginFieldsMissing: "Bitte gib Benutzername und Passwort ein.",
    userNotFound: "Benutzer nicht gefunden.",
    accessDisabled: "Zugang ist deaktiviert.",
    passwordWrong: "Falsches Passwort.",

    save: "Speichern",
    saving: "Wird gespeichert...",
    delete: "Löschen",
    defaultAddress: "Standardadresse",
    setAsDefault: "Als Standard setzen",
    billingUpdated: "Rechnungsadresse wurde gespeichert.",
    deliveryCreated: "Lieferadresse wurde gespeichert.",
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
    existingDeliveryAddresses: "Gespeicherte Lieferadressen",
    noDeliverySaved:
      "Sobald du eine Lieferadresse anlegst, erscheint sie hier.",

    forgotPasswordTitle: "Passwort zurücksetzen",
    forgotPasswordText:
      "Gib die E-Mail-Adresse deines Kontos ein. Den Mailversand bauen wir im nächsten Schritt vollständig an.",
    requestResetLink: "Link anfordern",
    resetEmailLabel: "E-Mail-Adresse",
    sendInstructions: "Anleitung senden",
    sendingInstructions: "Wird gesendet...",
    backToLogin: "Zurück zum Login",
    forgotPasswordInfoTitle: "Aktueller Status",
    forgotPasswordInfoText:
      "Die Oberfläche ist bereit. Der echte Mailversand wird als Nächstes mit Token und E-Mail-Logik angebunden.",
    forgotPasswordInvalidEmail:
      "Bitte gib eine gültige E-Mail-Adresse ein.",
    forgotPasswordNotLive:
      "Die Anfrage wurde erfasst. Der echte E-Mail-Versand ist aktuell noch nicht aktiv.",
  },

  en: {
    brand: "Let Me Bowl",

    welcome: "Welcome",
    account: "Account",
    ordersTitle: "Orders",
    addresses: "Addresses",
    billingAddressNav: "Billing address",
    shippingAddressesNav: "Delivery addresses",
    invoices: "Invoices",
    orderNow: "Order now",
    logout: "Logout",
    homepage: "Website",

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

    registerTitle: "Create account",
    registerText:
      "Create your business account for orders, invoices and addresses.",
    registerSubmitting: "Creating...",
    alreadyRegistered: "Already registered?",
    loginNow: "Sign in now",

    registerFillRequired: "Please fill in all required fields.",
    registerEmailInvalid: "Please enter a valid email address.",
    registerUsernameShort: "Username must be at least 3 characters.",
    registerPasswordShort: "Password must be at least 8 characters.",
    registerPasswordMismatch: "Passwords do not match.",
    registerUserExists: "Email or username already exists.",

    company: "Company",
    companyPlaceholder: "e.g. Example Ltd.",
    firstName: "First name",
    firstNamePlaceholder: "First name",
    lastName: "Last name",
    lastNamePlaceholder: "Last name",
    username: "Username",
    usernamePlaceholder: "e.g. company-berlin",
    email: "Email",
    emailPlaceholder: "name@company.com",
    phone: "Phone",
    phonePlaceholder: "+49 ...",
    passwordRegisterPlaceholder: "At least 8 characters",
    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Repeat password",

    accountText:
      "Manage your account, invoices, orders and delivery addresses in one place.",
    addressesText: "Manage your delivery and billing addresses.",
    invoicesText: "Overview of all invoices and payments.",
    orderNowText: "Start a new order directly.",
    openAddresses: "Open addresses",
    openInvoices: "Open invoices",
    startOrder: "Start order",

    billingAddressTitle: "Billing address",
    billingAddressText:
      "Manage your billing details for quotes, invoicing and future orders.",
    shippingAddressesTitle: "Delivery addresses",
    shippingAddressesText:
      "Manage your saved delivery locations for future catering orders.",
    billingAddress: "Billing address",
    shippingAddresses: "Delivery addresses",
    noShippingAddress: "No delivery address yet.",

    invoiceText:
      "Here you will find all invoices and their current payment status.",
    statusNow: "Current status",
    invoiceStatusTextStart: "For",
    invoiceStatusTextEnd:
      "the invoice overview is prepared. Next we will connect real invoice data.",
    invoiceNumber: "Invoice",
    date: "Date",
    status: "Status",
    amount: "Amount",
    paid: "Paid",
    open: "Open",

    ordersText:
      "Here you can find your past and current orders in one clear overview.",
    orderNumber: "Order",
    orderType: "Type",
    reorderTitle: "Reorder",
    reorderText:
      "Start a new order quickly based on your previous catering requests.",
    positions: "Items",

    loginFieldsMissing: "Please enter username and password.",
    userNotFound: "User not found.",
    accessDisabled: "Access is disabled.",
    passwordWrong: "Wrong password.",

    save: "Save",
    saving: "Saving...",
    delete: "Delete",
    defaultAddress: "Default address",
    setAsDefault: "Set as default",
    billingUpdated: "Billing address has been saved.",
    deliveryCreated: "Delivery address has been saved.",
    deliveryDeleted: "Delivery address has been deleted.",
    deliveryDefaultUpdated: "Default delivery address has been updated.",
    addressFormError: "Please fill in all required fields.",
    street: "Street",
    streetPlaceholder: "Street name",
    houseNumber: "House number",
    houseNumberPlaceholder: "e.g. 12A",
    postalCode: "Postal code",
    postalCodePlaceholder: "e.g. 12345",
    city: "City",
    cityPlaceholder: "Berlin",
    country: "Country",
    countryPlaceholder: "Germany",
    notes: "Notes",
    notesPlaceholder: "e.g. 3rd floor, reception on ground floor",
    label: "Label",
    labelPlaceholder: "e.g. Office, HQ, Warehouse",
    invoiceEmail: "Invoice email",
    vatId: "VAT ID",
    addDeliveryTitle: "New delivery address",
    existingDeliveryAddresses: "Saved delivery addresses",
    noDeliverySaved:
      "As soon as you add a delivery address, it will appear here.",

    forgotPasswordTitle: "Reset password",
    forgotPasswordText:
      "Enter the email address of your account. The real email delivery will be connected in the next step.",
    requestResetLink: "Request link",
    resetEmailLabel: "Email address",
    sendInstructions: "Send instructions",
    sendingInstructions: "Sending...",
    backToLogin: "Back to login",
    forgotPasswordInfoTitle: "Current status",
    forgotPasswordInfoText:
      "The interface is ready. Real email delivery will be connected next with token and mail logic.",
    forgotPasswordInvalidEmail:
      "Please enter a valid email address.",
    forgotPasswordNotLive:
      "Your request was recorded. Real email delivery is not active yet.",
  },
};