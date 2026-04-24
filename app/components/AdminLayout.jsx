const colors = {
  bg: "#f7f4ee",
  card: "#ffffff",
  text: "#171717",
  muted: "#756b5f",
  line: "#e8decd",
  gold: "#c8a96a",
  dark: "#151515",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    fontFamily: "Inter, Arial, sans-serif",
  },
  sidebar: {
    background: "linear-gradient(180deg, #151515 0%, #222018 100%)",
    padding: "30px 20px",
    color: "#fff",
  },
  brand: {
    fontSize: "18px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    marginBottom: "6px",
  },
  brandSub: {
    fontSize: "12px",
    color: "#d8c391",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "34px",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    color: "rgba(255,255,255,0.78)",
    padding: "13px 14px",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: 800,
    border: "1px solid transparent",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
  },
  active: {
    background: "rgba(200,169,106,0.16)",
    color: "#fff",
    border: "1px solid rgba(200,169,106,0.36)",
  },
  sidebarFooter: {
    marginTop: "34px",
    padding: "16px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.72)",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  contentWrap: {
    padding: "30px",
  },
  topbar: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: "24px",
    padding: "22px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    boxShadow: "0 18px 45px rgba(30,20,10,0.06)",
  },
  kicker: {
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.12em",
    color: colors.gold,
    textTransform: "uppercase",
    marginBottom: "6px",
  },
  topbarTitle: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.15,
    color: colors.text,
    letterSpacing: "-0.03em",
  },
  topbarText: {
    margin: "7px 0 0",
    fontSize: "14px",
    color: colors.muted,
    lineHeight: 1.5,
  },
  userBox: {
    fontSize: "14px",
    color: colors.text,
    background: "#faf6ee",
    border: `1px solid ${colors.line}`,
    padding: "11px 15px",
    borderRadius: "999px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },
};

function go(to) {
  window.location.href = to;
}

export default function AdminLayout({ title, subtitle, user, children }) {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  const items = [
    { label: "Dashboard", icon: "▦", href: "/admin", match: pathname === "/admin" },
    {
      label: "Firmenkunden",
      icon: "◎",
      href: "/admin/customers",
      match: pathname.startsWith("/admin/customers"),
    },
    {
      label: "Rechnungen",
      icon: "◧",
      href: "/admin/invoices",
      match: pathname.startsWith("/admin/invoices"),
    },
  ];

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>LET ME BOWL</div>
          <div style={styles.brandSub}>Adminbereich</div>
        </div>

        <nav style={styles.nav}>
          {items.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              style={{
                ...styles.link,
                ...(item.match ? styles.active : {}),
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          Verwalte Firmenkunden, Rechnungen und interne Abläufe zentral im
          Let Me Bowl Portal.
        </div>
      </aside>

      <main style={styles.contentWrap}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.kicker}>Let Me Bowl Portal</div>
            <h1 style={styles.topbarTitle}>{title}</h1>
            <p style={styles.topbarText}>{subtitle}</p>
          </div>

          <div style={styles.userBox}>{user?.email || "Admin"}</div>
        </div>

        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}