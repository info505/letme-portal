export const colors = {
  bg: "#f9f7f3",
  card: "#ffffff",
  text: "#17281d",
  muted: "#727a73",
  border: "#e5e5e5",
  gold: "#234c30",
};

export const layout = {
  page: {
    background: colors.bg,
    minHeight: "100vh",
    fontFamily: "Inter, sans-serif",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 20px",
  },
};

export const card = {
  base: {
    background: colors.card,
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: `1px solid ${colors.border}`,
  },
};

export const button = {
  primary: {
    background: colors.gold,
    color: "#fff",
    border: "none",
    padding: "14px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondary: {
    background: "transparent",
    border: `1px solid ${colors.border}`,
    padding: "12px 16px",
    borderRadius: "10px",
    cursor: "pointer",
  },
};

export const input = {
  base: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: `1px solid ${colors.border}`,
    marginTop: "6px",
    marginBottom: "16px",
  },
};