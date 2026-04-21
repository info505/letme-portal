import { redirect } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (user.isAdmin) {
    throw redirect("/admin");
  }

  return { user };
}

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f3eb",
        padding: "60px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#1a1a1a",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "50px 40px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid #e7dcc7",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#b08b4f",
            marginBottom: "14px",
            fontWeight: "bold",
          }}
        >
          Let Me Bowl Catering
        </div>

        <h1
          style={{
            fontSize: "40px",
            lineHeight: "1.2",
            margin: "0 0 18px 0",
          }}
        >
          Willkommen bei deinem Kundenkonto
        </h1>

        <p
          style={{
            fontSize: "18px",
            lineHeight: "1.7",
            color: "#4a4a4a",
            marginBottom: "30px",
          }}
        >
          Hier entsteht dein eigenes Let Me Bowl Kundenkonto. Kunden können hier
          später ihre Daten verwalten, frühere Bestellungen ansehen und bequem
          erneut bestellen.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginTop: "30px",
          }}
        >
          <div
            style={{
              background: "#faf7f1",
              border: "1px solid #eadfcd",
              borderRadius: "18px",
              padding: "22px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "20px" }}>
              Kundendaten
            </h3>
            <p style={{ margin: 0, color: "#555", lineHeight: "1.6" }}>
              Name, Firma, E-Mail, Telefonnummer und Rechnungsdaten.
            </p>
          </div>

          <div
            style={{
              background: "#faf7f1",
              border: "1px solid #eadfcd",
              borderRadius: "18px",
              padding: "22px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "20px" }}>
              Bestellungen
            </h3>
            <p style={{ margin: 0, color: "#555", lineHeight: "1.6" }}>
              Übersicht über vergangene Bestellungen und Bestellstatus.
            </p>
          </div>

          <div
            style={{
              background: "#faf7f1",
              border: "1px solid #eadfcd",
              borderRadius: "18px",
              padding: "22px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px", fontSize: "20px" }}>
              Schnell nachbestellen
            </h3>
            <p style={{ margin: 0, color: "#555", lineHeight: "1.6" }}>
              Frühere Bestellungen und Lieblingsprodukte später mit einem Klick
              erneut bestellen.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "34px",
            padding: "18px 20px",
            borderRadius: "16px",
            background: "#fff8eb",
            border: "1px solid #efdcae",
            color: "#6b5a2b",
            fontSize: "15px",
            lineHeight: "1.6",
          }}
        >
          Dies ist aktuell die vorbereitete Startansicht deines eigenen
          Kundenkontos. Im nächsten Schritt binden wir echte Kundendaten und
          Bestellungen an.
        </div>
      </div>
    </div>
  );
}