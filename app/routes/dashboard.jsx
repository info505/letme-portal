import { redirect } from "react-router";
import { getUserFromRequest } from "../lib/auth.server";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  return { user };
}

export default function DashboardPage({ loaderData }) {
  const { user } = loaderData;

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
          maxWidth: 1100,
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
          Willkommen, {user.firstName}
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          <div style={cardStyle}>
            <h3 style={titleStyle}>Firma</h3>
            <p style={textStyle}>{user.companyName}</p>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>Benutzername</h3>
            <p style={textStyle}>{user.username}</p>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>E-Mail</h3>
            <p style={textStyle}>{user.email}</p>
          </div>

          <div style={cardStyle}>
            <h3 style={titleStyle}>Telefon</h3>
            <p style={textStyle}>{user.phone || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#efede7",
  border: "1px solid #e2d7c3",
  borderRadius: 18,
  padding: 18,
};

const titleStyle = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 20,
};

const textStyle = {
  margin: 0,
  color: "#3f3a33",
  lineHeight: 1.5,
};