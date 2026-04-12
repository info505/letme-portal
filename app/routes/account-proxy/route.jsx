import { Form, useActionData, useLoaderData, useNavigation } from "react-router";

export const loader = async () => {
  return {
    isLoggedIn: false,
    customer: {
      company: "Let Me Bowl Business GmbH",
      username: "letmebowl-admin",
      email: "kunde@firma.de",
      phone: "+49 170 1234567",
      firstName: "Max",
      lastName: "Mustermann",
    },
    orders: [
      {
        id: "#1001",
        date: "12.04.2026",
        status: "Bezahlt",
        total: "189,50 €",
      },
      {
        id: "#1000",
        date: "02.04.2026",
        status: "Geliefert",
        total: "86,40 €",
      },
    ],
  };
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "register") {
    const company = String(formData.get("company") || "").trim();
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const username = String(formData.get("username") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!company || !firstName || !lastName || !username || !email || !phone || !password || !confirmPassword) {
      return {
        ok: false,
        mode: "register",
        message: "Bitte fülle alle Pflichtfelder aus.",
      };
    }

    if (!email.includes("@")) {
      return {
        ok: false,
        mode: "register",
        message: "Bitte gib eine gültige E-Mail-Adresse ein.",
      };
    }

    if (password.length < 8) {
      return {
        ok: false,
        mode: "register",
        message: "Das Passwort muss mindestens 8 Zeichen haben.",
      };
    }

    if (password !== confirmPassword) {
      return {
        ok: false,
        mode: "register",
        message: "Die Passwörter stimmen nicht überein.",
      };
    }

    return {
      ok: true,
      mode: "register",
      message: "Registrierung erfolgreich vorbereitet.",
    };
  }

  if (intent === "login") {
    const login = String(formData.get("login") || "").trim();
    const password = String(formData.get("password") || "");

    if (!login || !password) {
      return {
        ok: false,
        mode: "login",
        message: "Bitte Benutzername oder E-Mail und Passwort eingeben.",
      };
    }

    return {
      ok: true,
      mode: "login",
      message: "Anmeldung erfolgreich vorbereitet.",
    };
  }

  return null;
};

export default function AccountProxyPage() {
  const { isLoggedIn, customer, orders } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const currentMode = actionData?.mode || "register";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e9e5dc",
        padding: "40px 20px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          background: "#f7f6f3",
          borderRadius: 28,
          padding: 40,
          boxShadow: "0 18px 50px rgba(0,0,0,0.06)",
          border: "1px solid #ece6da",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              color: "#c89a46",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            Let Me Bowl Catering
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 58,
              lineHeight: 1.03,
              color: "#111",
              letterSpacing: "-0.03em",
            }}
          >
            Mein Kundenkonto
          </h1>
        </div>

        {!isLoggedIn ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.08fr 0.92fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "linear-gradient(180deg, #f1eee8 0%, #ece7de 100%)",
                borderRadius: 24,
                padding: 30,
                border: "1px solid #e2d7c3",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  gap: 10,
                  background: "#f7f6f3",
                  borderRadius: 14,
                  padding: 8,
                  border: "1px solid #e4ddd0",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: 10,
                    background: currentMode === "login" ? "#111" : "transparent",
                    color: currentMode === "login" ? "#fff" : "#111",
                    fontWeight: 700,
                  }}
                >
                  Anmelden
                </div>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: 10,
                    background: currentMode === "register" ? "#c89a46" : "transparent",
                    color: currentMode === "register" ? "#fff" : "#111",
                    fontWeight: 700,
                  }}
                >
                  Registrieren
                </div>
              </div>

              {actionData?.message ? (
                <div
                  style={{
                    marginBottom: 18,
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: actionData.ok ? "#eef6eb" : "#fff1f1",
                    color: actionData.ok ? "#1d5f2f" : "#8b2222",
                    border: `1px solid ${actionData.ok ? "#cde3d0" : "#f1caca"}`,
                    fontWeight: 600,
                  }}
                >
                  {actionData.message}
                </div>
              ) : null}

              {currentMode === "login" ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="login" />

                  <div style={{ display: "grid", gap: 16 }}>
                    <Field
                      label="Benutzername oder E-Mail"
                      name="login"
                      type="text"
                      placeholder="benutzername oder name@firma.de"
                    />

                    <Field
                      label="Passwort"
                      name="password"
                      type="password"
                      placeholder="Passwort eingeben"
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={primaryButton}
                    >
                      {isSubmitting ? "Wird verarbeitet..." : "Anmelden"}
                    </button>

                    <div
                      style={{
                        fontSize: 14,
                        color: "#6d6558",
                        marginTop: 4,
                      }}
                    >
                      Noch kein Zugang? Aktualisiere die Seite nach einer Registrierung
                      oder wir bauen im nächsten Schritt echtes Umschalten ein.
                    </div>
                  </div>
                </Form>
              ) : (
                <Form method="post">
                  <input type="hidden" name="intent" value="register" />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field
                        label="Firmenname"
                        name="company"
                        type="text"
                        placeholder="z. B. Musterfirma GmbH"
                      />
                    </div>

                    <Field
                      label="Vorname"
                      name="firstName"
                      type="text"
                      placeholder="Vorname"
                    />

                    <Field
                      label="Nachname"
                      name="lastName"
                      type="text"
                      placeholder="Nachname"
                    />

                    <Field
                      label="Benutzername"
                      name="username"
                      type="text"
                      placeholder="z. B. firma-berlin"
                    />

                    <Field
                      label="Telefon"
                      name="phone"
                      type="tel"
                      placeholder="+49 ..."
                    />

                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field
                        label="E-Mail"
                        name="email"
                        type="email"
                        placeholder="name@firma.de"
                      />
                    </div>

                    <Field
                      label="Passwort"
                      name="password"
                      type="password"
                      placeholder="Mindestens 8 Zeichen"
                    />

                    <Field
                      label="Passwort wiederholen"
                      name="confirmPassword"
                      type="password"
                      placeholder="Passwort wiederholen"
                    />
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={goldButton}
                    >
                      {isSubmitting ? "Wird verarbeitet..." : "Jetzt registrieren"}
                    </button>
                  </div>
                </Form>
              )}
            </div>

            <div
              style={{
                background: "#efede7",
                borderRadius: 24,
                padding: 28,
                border: "1px solid #e2d7c3",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  fontSize: 34,
                  lineHeight: 1.1,
                }}
              >
                Firmenzugang
              </h2>

              <div style={{ display: "grid", gap: 14 }}>
                <InfoCard
                  title="Zentrale Stammdaten"
                  text="Firma, Ansprechpartner, E-Mail, Telefon und individuelle Zugangsdaten."
                />
                <InfoCard
                  title="Bestellübersicht"
                  text="Vergangene Bestellungen, Status, Volumen und Wiederbestellung auf einen Blick."
                />
                <InfoCard
                  title="Schneller Nachkauf"
                  text="Lieblingsprodukte später mit wenigen Klicks erneut bestellen."
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 26 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 22,
              }}
            >
              <div style={cardStyle}>
                <h2 style={cardTitle}>Kundendaten</h2>
                <DataRow label="Firma" value={customer.company} />
                <DataRow label="Benutzername" value={customer.username} />
                <DataRow label="E-Mail" value={customer.email} />
                <DataRow label="Telefon" value={customer.phone} />
                <DataRow
                  label="Ansprechpartner"
                  value={`${customer.firstName} ${customer.lastName}`}
                />
              </div>

              <div style={cardStyle}>
                <h2 style={cardTitle}>Schnellaktionen</h2>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a href="https://letmebowl-catering.de" style={darkLinkButton}>
                    Neu bestellen
                  </a>
                  <a href="/apps/account?edit=true" style={goldLinkButton}>
                    Daten bearbeiten
                  </a>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={cardTitle}>Vergangene Bestellungen</h2>

              <div style={{ display: "grid", gap: 14 }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                      gap: 16,
                      alignItems: "center",
                      background: "#f7f6f3",
                      border: "1px solid #ddd6c8",
                      borderRadius: 16,
                      padding: "18px 20px",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{order.id}</div>
                    <div>{order.date}</div>
                    <div>{order.status}</div>
                    <div style={{ fontWeight: 800 }}>{order.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, type, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: "#1d1d1d",
        }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        style={{
          width: "100%",
          borderRadius: 14,
          border: "1px solid #d9d1c2",
          background: "#fcfbf9",
          padding: "15px 16px",
          fontSize: 16,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

function InfoCard({ title, text }) {
  return (
    <div
      style={{
        background: "#f7f6f3",
        border: "1px solid #e2d7c3",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{title}</div>
      <div style={{ color: "#4c473f", lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid #ece4d6",
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: "#efede7",
  border: "1px solid #e2d7c3",
  borderRadius: 24,
  padding: 26,
};

const cardTitle = {
  marginTop: 0,
  marginBottom: 18,
  fontSize: 34,
  lineHeight: 1.08,
};

const primaryButton = {
  border: "none",
  borderRadius: 14,
  background: "#111",
  color: "#fff",
  fontWeight: 800,
  fontSize: 16,
  padding: "15px 18px",
  cursor: "pointer",
};

const goldButton = {
  border: "none",
  borderRadius: 14,
  background: "#c89a46",
  color: "#fff",
  fontWeight: 800,
  fontSize: 16,
  padding: "15px 18px",
  cursor: "pointer",
  width: "100%",
};

const darkLinkButton = {
  background: "#111",
  color: "#fff",
  textDecoration: "none",
  padding: "13px 18px",
  borderRadius: 12,
  fontWeight: 800,
};

const goldLinkButton = {
  background: "#c89a46",
  color: "#fff",
  textDecoration: "none",
  padding: "13px 18px",
  borderRadius: 12,
  fontWeight: 800,
};