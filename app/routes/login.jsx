import { Form, redirect, useActionData, useNavigation } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import {
  verifyPassword,
  createPortalSession,
  createSessionCookie,
  getUserFromRequest,
} from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (user) {
    throw redirect("/dashboard");
  }

  return null;
}

export async function action({ request }) {
  const formData = await request.formData();

  const login = String(formData.get("login") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const values = { login };

  if (!login || !password) {
    return {
      ok: false,
      message: "Bitte gib Benutzername oder E-Mail und dein Passwort ein.",
      values,
    };
  }

  const user = await prisma.portalUser.findFirst({
    where: {
      OR: [{ email: login }, { username: login }],
    },
  });

  if (!user) {
    return {
      ok: false,
      message: "Benutzer nicht gefunden.",
      values,
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      message: "Dein Zugang ist aktuell deaktiviert.",
      values,
    };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    return {
      ok: false,
      message: "Das Passwort ist nicht korrekt.",
      values,
    };
  }

  const { sessionToken, expiresAt } = await createPortalSession(user.id);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": createSessionCookie(sessionToken, expiresAt),
    },
  });
}

export default function LoginPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const values = actionData?.values || {};

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={heroStyle}>
          <div style={eyebrowStyle}>Let Me Bowl Catering</div>
          <h1 style={headlineStyle}>Anmelden</h1>
          <p style={sublineStyle}>
            Zugriff auf dein Firmenkonto, Bestellungen, Rechnungsdaten und
            Lieferadressen.
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
                  label="Benutzername oder E-Mail"
                  name="login"
                  defaultValue={values.login}
                  placeholder="z. B. firma-berlin oder name@firma.de"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Passwort"
                  name="password"
                  type="password"
                  placeholder="Dein Passwort"
                />
              </div>
            </div>

            <button type="submit" style={buttonStyle} disabled={isSubmitting}>
              {isSubmitting ? "Anmeldung läuft..." : "Jetzt anmelden"}
            </button>
          </Form>

          <div style={linksWrapStyle}>
            <a href="/forgot-password" style={secondaryLinkStyle}>
              Passwort vergessen?
            </a>
          </div>

          <div style={footerTextStyle}>
            Noch kein Konto?{" "}
            <a href="/register" style={linkStyle}>
              Jetzt registrieren
            </a>
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
  maxWidth: 980,
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
  maxWidth: 700,
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
  gridTemplateColumns: "1fr",
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

const linksWrapStyle = {
  marginTop: 16,
  textAlign: "center",
};

const secondaryLinkStyle = {
  color: "#5a5348",
  fontWeight: 700,
  textDecoration: "none",
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