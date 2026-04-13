import { Form, redirect, useActionData, useNavigation } from "react-router";
import { prisma } from "../lib/prisma.server";
import {
  hashPassword,
  createPortalSession,
  createSessionCookie,
} from "../lib/auth.server";

export async function action({ request }) {
  const formData = await request.formData();

  const companyName = String(formData.get("companyName") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const values = {
    companyName,
    firstName,
    lastName,
    username,
    email,
    phone,
  };

  if (
    !companyName ||
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return {
      ok: false,
      message: "Bitte fülle alle Pflichtfelder aus.",
      values,
    };
  }

  if (!email.includes("@")) {
    return {
      ok: false,
      message: "Bitte gib eine gültige E-Mail-Adresse ein.",
      values,
    };
  }

  if (username.length < 3) {
    return {
      ok: false,
      message: "Der Benutzername muss mindestens 3 Zeichen haben.",
      values,
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens 8 Zeichen lang sein.",
      values,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: "Die Passwörter stimmen nicht überein.",
      values,
    };
  }

  const existingUser = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    return {
      ok: false,
      message: "E-Mail oder Benutzername ist bereits vergeben.",
      values,
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.portalUser.create({
    data: {
      companyName,
      firstName,
      lastName,
      username,
      email,
      phone,
      passwordHash,
      billing: {
        create: {
          companyName,
          contactName: `${firstName} ${lastName}`,
          email,
          phone,
        },
      },
    },
  });

  const { sessionToken, expiresAt } = await createPortalSession(user.id);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": createSessionCookie(sessionToken, expiresAt),
    },
  });
}

export default function RegisterPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const values = actionData?.values || {};

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <div style={eyebrowStyle}>Let Me Bowl Catering</div>
          <h1 style={headlineStyle}>Konto erstellen</h1>
          <p style={sublineStyle}>
            Firmenzugang für Bestellungen, Rechnungsdaten und Lieferadressen.
          </p>
        </div>

        <div style={cardStyle}>
          {actionData?.message ? (
            <div style={errorStyle}>{actionData.message}</div>
          ) : null}

          <Form method="post">
            <div style={gridStyle}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Firmenname"
                  name="companyName"
                  defaultValue={values.companyName}
                  placeholder="z. B. Musterfirma GmbH"
                />
              </div>

              <Field
                label="Vorname"
                name="firstName"
                defaultValue={values.firstName}
                placeholder="Vorname"
              />

              <Field
                label="Nachname"
                name="lastName"
                defaultValue={values.lastName}
                placeholder="Nachname"
              />

              <Field
                label="Benutzername"
                name="username"
                defaultValue={values.username}
                placeholder="z. B. firma-berlin"
              />

              <Field
                label="Telefon"
                name="phone"
                defaultValue={values.phone}
                placeholder="+49 ..."
              />

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="E-Mail"
                  name="email"
                  type="email"
                  defaultValue={values.email}
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

            <button type="submit" style={buttonStyle} disabled={isSubmitting}>
              {isSubmitting ? "Wird erstellt..." : "Jetzt registrieren"}
            </button>
          </Form>

          <div style={footerTextStyle}>
            Bereits registriert? <a href="/login" style={linkStyle}>Jetzt anmelden</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder = "",
  defaultValue = "",
}) {
  return (
    <label style={fieldWrapStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={inputStyle}
      />
    </label>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#e9e5dc",
  padding: "24px 16px",
  fontFamily: "Inter, Arial, sans-serif",
};

const shellStyle = {
  maxWidth: 1100,
  margin: "0 auto",
};

const heroStyle = {
  marginBottom: 24,
};

const eyebrowStyle = {
  color: "#c89a46",
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontSize: 13,
  marginBottom: 12,
};

const headlineStyle = {
  fontSize: "clamp(34px, 6vw, 60px)",
  lineHeight: 1.02,
  margin: 0,
  color: "#111",
};

const sublineStyle = {
  marginTop: 14,
  fontSize: "clamp(16px, 2.5vw, 20px)",
  color: "#3f3a33",
  maxWidth: 760,
  lineHeight: 1.5,
};

const cardStyle = {
  background: "#f7f6f3",
  borderRadius: 24,
  padding: "24px",
  border: "1px solid #e6dfd2",
  boxShadow: "0 14px 40px rgba(0,0,0,0.05)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const fieldWrapStyle = {
  display: "grid",
  gap: 8,
};

const labelStyle = {
  fontWeight: 700,
  fontSize: 15,
  color: "#1a1a1a",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d8cfbf",
  background: "#fff",
  borderRadius: 14,
  padding: "15px 16px",
  fontSize: 16,
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  marginTop: 20,
  border: "none",
  borderRadius: 14,
  background: "#111",
  color: "#fff",
  fontSize: 16,
  fontWeight: 800,
  padding: "15px 18px",
  cursor: "pointer",
};

const errorStyle = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 14,
  background: "#fff1f1",
  color: "#8b2222",
  border: "1px solid #f1caca",
  fontWeight: 600,
};

const footerTextStyle = {
  marginTop: 18,
  textAlign: "center",
  color: "#5a5348",
};

const linkStyle = {
  color: "#111",
  fontWeight: 700,
  textDecoration: "none",
};