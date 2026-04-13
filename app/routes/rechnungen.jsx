import { redirect } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  return { user };
}

export default function RechnungenPage({ loaderData }) {
  const { user } = loaderData;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <a href="https://letmebowl-catering.de" style={logoStyle}>
            LET ME BOWL
          </a>

          <div style={menuWrapStyle}>
            <details style={detailsStyle}>
              <summary style={summaryStyle}>
                Menü
                <span style={caretStyle}>▾</span>
              </summary>

              <div style={dropdownStyle}>
                <a href="/dashboard" style={dropdownLinkStyle}>
                  Konto
                </a>
                <a href="/rechnungen" style={dropdownActiveStyle}>
                  Rechnungen
                </a>
                <a href="/adressen" style={dropdownLinkStyle}>
                  Adressen
                </a>
                <a href="/logout" style={dropdownLogoutStyle}>
                  Abmelden
                </a>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main style={mainWrapStyle}>
        <div style={cardShellStyle}>
          <div style={eyebrowStyle}>Let Me Bowl Catering</div>
          <h1 style={headlineStyle}>Rechnungen</h1>
          <p style={sublineStyle}>
            Hier werden später deine Rechnungen, Zahlungsstände und Downloads
            angezeigt.
          </p>

          <div style={infoCardStyle}>
            <h3 style={sectionTitleStyle}>Aktueller Status</h3>
            <p style={textStyle}>
              Für <strong>{user.companyName}</strong> ist die Rechnungsübersicht
              vorbereitet. Als Nächstes binden wir echte Rechnungsdaten an.
            </p>
          </div>

          <div style={tableWrapStyle}>
            <div style={tableHeaderStyle}>
              <div>Rechnungsnr.</div>
              <div>Datum</div>
              <div>Status</div>
              <div>Betrag</div>
            </div>

            <div style={tableRowStyle}>
              <div>#2026-001</div>
              <div>12.04.2026</div>
              <div>Bezahlt</div>
              <div>189,50 €</div>
            </div>

            <div style={tableRowStyle}>
              <div>#2026-002</div>
              <div>02.04.2026</div>
              <div>Offen</div>
              <div>86,40 €</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#e9e5dc",
  fontFamily: "Inter, Arial, sans-serif",
};

const headerStyle = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(247, 246, 243, 0.96)",
  borderBottom: "1px solid #e6dfd2",
  backdropFilter: "blur(10px)",
};

const headerInnerStyle = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const logoStyle = {
  textDecoration: "none",
  color: "#111",
  fontWeight: 900,
  letterSpacing: "0.14em",
  fontSize: 14,
};

const menuWrapStyle = {
  position: "relative",
};

const detailsStyle = {
  position: "relative",
};

const summaryStyle = {
  listStyle: "none",
  cursor: "pointer",
  background: "#111",
  color: "#fff",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 8,
  userSelect: "none",
};

const caretStyle = {
  fontSize: 12,
  lineHeight: 1,
};

const dropdownStyle = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 10px)",
  minWidth: 210,
  background: "#f7f6f3",
  border: "1px solid #e6dfd2",
  borderRadius: 16,
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
  padding: 8,
  display: "grid",
  gap: 6,
};

const dropdownLinkStyle = {
  display: "block",
  textDecoration: "none",
  color: "#222",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: 600,
  background: "#fff",
  border: "1px solid #eee4d3",
};

const dropdownActiveStyle = {
  display: "block",
  textDecoration: "none",
  color: "#111",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: 800,
  background: "#efe5d1",
  border: "1px solid #dcc593",
};

const dropdownLogoutStyle = {
  display: "block",
  textDecoration: "none",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: 700,
  background: "#111",
  border: "1px solid #111",
};

const mainWrapStyle = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 16px 40px",
};

const cardShellStyle = {
  background: "#f7f6f3",
  borderRadius: 24,
  padding: 24,
  border: "1px solid #e6dfd2",
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
  marginTop: 0,
  marginBottom: 12,
  fontSize: "clamp(32px, 6vw, 54px)",
  lineHeight: 1.02,
  color: "#111",
};

const sublineStyle = {
  marginTop: 0,
  marginBottom: 24,
  color: "#4f493f",
  fontSize: 18,
  lineHeight: 1.5,
  maxWidth: 760,
};

const infoCardStyle = {
  background: "#efede7",
  border: "1px solid #e2d7c3",
  borderRadius: 18,
  padding: 18,
  marginBottom: 24,
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 22,
};

const textStyle = {
  margin: 0,
  color: "#3f3a33",
  lineHeight: 1.6,
};

const tableWrapStyle = {
  display: "grid",
  gap: 12,
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
  gap: 12,
  fontWeight: 800,
  color: "#111",
  padding: "0 8px",
};

const tableRowStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
  gap: 12,
  background: "#fff",
  border: "1px solid #e6dfd2",
  borderRadius: 14,
  padding: "16px 14px",
  color: "#3f3a33",
};