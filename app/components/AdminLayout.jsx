const styles = {
  page: {
    minHeight: "100vh",
    background: "#f7f4ee",
    display: "grid",
    gridTemplateColumns: "260px 1fr",
  },
  sidebar: {
    background: "#fff",
    borderRight: "1px solid #e7dfd1",
    padding: "28px 20px",
  },
  brand: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1f1f1f",
    marginBottom: "24px",
    letterSpacing: "0.02em",
  },
  brandSub: {
    fontSize: "12px",
    color: "#8a7f70",
    marginTop: "4px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "26px",
  },
  link: {
    display: "block",
    textDecoration: "none",
    color: "#2a2a2a",
    padding: "12px 14px",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 600,
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
  },
  contentWrap: {
    padding: "28px",
  },
  topbar: {
    background: "#fff",
    border: "1px solid #e7dfd1",
    borderRadius: "20px",
    padding: "18px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },
  topbarTitle: {
    margin: 0,
    fontSize: "24px",
    lineHeight: 1.2,
    color: "#161616",
  },
  topbarText: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "#7d7468",
  },
  userBox: {
    fontSize: "14px",
    color: "#4d463d",
    background: "#f8f4ec",
    border: "1px solid #e7dfd1",
    padding: "10px 14px",
    borderRadius: "999px",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  active: {
    background: "#f3ede3",
    color: "#111",
    border: "1px solid #e1d5bf",
  },
};

function go(to) {
  window.location.href = to;
}

export default function AdminLayout({ title, subtitle, user, children }) {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          Let Me Bowl
          <div style={styles.brandSub}>Adminbereich</div>
        </div>

        <nav style={styles.nav}>
          <button
            type="button"
            onClick={() => go("/admin")}
            style={{
              ...styles.link,
              ...(pathname === "/admin" ? styles.active : {}),
            }}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => go("/admin/customers")}
            style={{
              ...styles.link,
              ...(pathname.startsWith("/admin/customers") ? styles.active : {}),
            }}
          >
            Firmenkunden
          </button>

          <button
            type="button"
            onClick={() => go("/admin/invoices")}
            style={{
              ...styles.link,
              ...(pathname.startsWith("/admin/invoices") ? styles.active : {}),
            }}
          >
            Rechnungen
          </button>
        </nav>
      </aside>

      <main style={styles.contentWrap}>
        <div style={styles.topbar}>
          <div>
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