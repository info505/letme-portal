export const colors = {
  bg: "var(--lmb-ivory)",
  card: "var(--lmb-white)",
  text: "var(--lmb-ink)",
  muted: "var(--lmb-muted)",
  border: "var(--lmb-stroke)",
  gold: "var(--lmb-forest)",
};

export const layout = {
  page: {
    background: colors.bg,
    minHeight: "100vh",
    fontFamily: "var(--lmb-font-body)",
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