Dann DAS hier komplett einfügen:
import { json } from "@remix-run/node";

export const loader = async () => {
  return json({ status: "OK" });
};

export default function AccountProxyPage() {
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
        <h1>Let Me Bowl Kundenkonto funktioniert 🎉</h1>
        <p>Wenn du das siehst, ist dein App Proxy korrekt verbunden.</p>
      </div>
    </div>
  );
}