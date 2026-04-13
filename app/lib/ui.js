export const colors = {
  pageBg: "#e9e5dc",
  surface: "#f7f6f3",
  surfaceSoft: "#efede7",
  border: "#e2d7c3",
  borderSoft: "#e6dfd2",
  text: "#1f1a17",
  textSoft: "#4f493f",
  gold: "#c8a96a",
  goldDark: "#b8934f",
  goldSoft: "#efe5d1",
  dangerSoft: "#f4ebe6",
  dangerText: "#a05a3b",
  white: "#ffffff",
};

export const layout = {
  page: {
    minHeight: "100vh",
    background: colors.pageBg,
    fontFamily: "Inter, Arial, sans-serif",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(247, 246, 243, 0.96)",
    borderBottom: `1px solid ${colors.borderSoft}`,
    backdropFilter: "blur(10px)",
  },

  headerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },

  mainWrap: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px 16px 40px",
  },

  shellCard: {
    background: colors.surface,
    borderRadius: 24,
    padding: 24,
    border: `1px solid ${colors.borderSoft}`,
    boxShadow: "0 14px 40px rgba(0,0,0,0.05)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
};

export const textStyles = {
  logo: {
    textDecoration: "none",
    color: colors.text,
    fontWeight: 900,
    letterSpacing: "0.14em",
    fontSize: 14,
  },

  eyebrow: {
    color: colors.gold,
    fontWeight: 800,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontSize: 13,
    marginBottom: 12,
  },

  headline: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: "clamp(32px, 6vw, 54px)",
    lineHeight: 1.02,
    color: colors.text,
  },

  subline: {
    marginTop: 0,
    marginBottom: 24,
    color: colors.textSoft,
    fontSize: 18,
    lineHeight: 1.5,
    maxWidth: 760,
  },

  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 24,
    color: colors.text,
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: 20,
    color: colors.text,
  },

  body: {
    margin: 0,
    color: colors.textSoft,
    lineHeight: 1.6,
  },
};

export const cardStyles = {
  info: {
    background: colors.surfaceSoft,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 18,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
    gap: 12,
    background: colors.white,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 14,
    padding: "16px 14px",
    color: colors.textSoft,
  },

  rowHeader: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
    gap: 12,
    fontWeight: 800,
    color: colors.text,
    padding: "0 8px",
  },
};

export const buttonStyles = {
  primary: {
    display: "inline-block",
    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
    color: "#fff",
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  secondary: {
    display: "inline-block",
    background: colors.surfaceSoft,
    color: colors.textSoft,
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 600,
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
  },

  logout: {
    display: "inline-block",
    background: colors.dangerSoft,
    color: colors.dangerText,
    textDecoration: "none",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    border: "1px solid #e2cfc4",
    cursor: "pointer",
  },

  menuTrigger: {
    listStyle: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #c8a96a, #b8934f)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
    userSelect: "none",
  },
};

export const inputStyles = {
  wrap: {
    display: "grid",
    gap: 8,
  },

  label: {
    fontWeight: 700,
    fontSize: 15,
    color: colors.text,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    background: colors.white,
    borderRadius: 14,
    padding: "15px 16px",
    fontSize: 16,
    outline: "none",
    color: colors.text,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    background: colors.white,
    borderRadius: 14,
    padding: "15px 16px",
    fontSize: 16,
    outline: "none",
    color: colors.text,
    minHeight: 120,
    resize: "vertical",
  },
};

export const dropdownStyles = {
  wrap: {
    position: "relative",
  },

  details: {
    position: "relative",
  },

  menu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 10px)",
    minWidth: 230,
    background: colors.surface,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 16,
    boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
    padding: 8,
    display: "grid",
    gap: 6,
  },

  link: {
    display: "block",
    textDecoration: "none",
    color: colors.text,
    padding: "12px 14px",
    borderRadius: 10,
    fontWeight: 600,
    background: colors.white,
    border: `1px solid #eee4d3`,
  },

  active: {
    display: "block",
    textDecoration: "none",
    color: colors.text,
    padding: "12px 14px",
    borderRadius: 10,
    fontWeight: 800,
    background: colors.goldSoft,
    border: "1px solid #dcc593",
  },
};