export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e9e5dc",
        padding: "24px 16px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#f7f6f3",
          borderRadius: 24,
          padding: 24,
          border: "1px solid #e6dfd2",
        }}
      >
        <div
          style={{
            color: "#c89a46",
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Let Me Bowl Catering
        </div>

        <h1 style={{ marginTop: 0, fontSize: "clamp(32px, 6vw, 54px)" }}>
          Anmeldung
        </h1>

        <p>Die echte Login-Seite bauen wir im nächsten Schritt.</p>
        <a href="/register" style={{ color: "#111", fontWeight: 700 }}>
          Zur Registrierung
        </a>
      </div>
    </div>
  );
}