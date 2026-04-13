import { useLoaderData, useLocation } from "react-router";
import { colors } from "../lib/ui.js";
import { dict, withLang } from "../lib/i18n.js";

function getInitials(user) {
  const source =
    user?.firstName?.[0] ||
    user?.companyName?.[0] ||
    user?.email?.[0] ||
    user?.username?.[0] ||
    "P";

  return source.toUpperCase();
}

function getDisplayName(user) {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user?.companyName) return user.companyName;
  if (user?.email) return user.email;
  return "Portal";
}

function SidebarLink({ href, label, active = false }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        padding: "12px 14px",
        borderRadius: "14px",
        background: active ? "#f6f1e8" : "transparent",
        border: active ? "1px solid #eadfc8" : "1px solid transparent",
        color: active ? colors.text : colors.muted,
        fontWeight: active ? 700 : 600,
      }}
    >
      {label}
    </a>
  );
}

export default function PortalLayout({ children, title, subtitle }) {
  const location = useLocation();
  const data = useLoaderData?.() || {};
  const locale =
    data?.locale || new URLSearchParams(location.search).get("lang") || "de";
  const user = data?.user || null;
  const t = dict[locale] || dict.de;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        .portal-layout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          min-height: 100vh;
        }

        .portal-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .portal-sidebar {
          background: #fff;
          border-right: 1px solid ${colors.border};
          padding: 22px 18px;
          display: flex;
          flex-direction: column;
        }

        .portal-header {
          background: rgba(255,255,255,0.92);
          border-bottom: 1px solid ${colors.border};
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .portal-content {
          padding: 24px;
        }

        @media (max-width: 980px) {
          .portal-layout {
            grid-template-columns: 1fr;
          }

          .portal-sidebar {
            border-right: none;
            border-bottom: 1px solid ${colors.border};
            padding: 18px 16px;
          }

          .portal-header {
            padding: 16px;
            flex-direction: column;
            align-items: flex-start;
          }

          .portal-content {
            padding: 16px;
          }
        }
      `}</style>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <a
            href="https://letmebowl-catering.de"
            style={{
              textDecoration: "none",
              color: colors.text,
              fontWeight: 800,
              letterSpacing: "0.08em",
              fontSize: "15px",
              marginBottom: "24px",
            }}
          >
            LET ME BOWL
          </a>

          <div
            style={{
              padding: "14px",
              borderRadius: "18px",
              background: "#f8f4ec",
              border: "1px solid #ece2d0",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                background: "#fff",
                border: "1px solid #eadfc8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: "#8d6a2f",
                marginBottom: "10px",
              }}
            >
              {getInitials(user)}
            </div>

            <div
              style={{
                fontWeight: 700,
                color: colors.text,
                fontSize: "14px",
                lineHeight: 1.4,
              }}
            >
              {getDisplayName(user)}
            </div>

            <div
              style={{
                color: colors.muted,
                fontSize: "13px",
                marginTop: "4px",
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              {user?.companyName || ""}
            </div>
          </div>

          <nav style={{ display: "grid", gap: "8px" }}>
            <SidebarLink
              href={withLang("/dashboard", locale)}
              label={t.account}
              active={location.pathname === "/dashboard"}
            />
            <SidebarLink
              href={withLang("/bestellungen", locale)}
              label={t.ordersTitle}
              active={location.pathname === "/bestellungen"}
            />
            <SidebarLink
              href={withLang("/rechnungsadresse", locale)}
              label={t.billingAddressNav}
              active={location.pathname === "/rechnungsadresse"}
            />
            <SidebarLink
              href={withLang("/lieferadressen", locale)}
              label={t.shippingAddressesNav}
              active={location.pathname === "/lieferadressen"}
            />
            <SidebarLink
              href={withLang("/kostenstellen", locale)}
              label={t.costCentersNav}
              active={location.pathname === "/kostenstellen"}
            />
            <SidebarLink
              href={withLang("/rechnungen", locale)}
              label={t.invoices}
              active={location.pathname === "/rechnungen"}
            />
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ display: "grid", gap: "10px", marginTop: "24px" }}>
            <a
              href="https://letmebowl-catering.de"
              style={sidebarSecondaryLink}
            >
              {t.homepage}
            </a>

            <a
              href="https://letmebowl-catering.de"
              style={sidebarPrimaryLink}
            >
              {t.orderNow}
            </a>

            <a
              href={withLang("/logout", locale)}
              style={{ ...sidebarSecondaryLink, color: "#8b2222" }}
            >
              {t.logout}
            </a>
          </div>
        </aside>

        <div className="portal-main">
          <header className="portal-header">
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  color: colors.text,
                  lineHeight: 1.1,
                }}
              >
                {title}
              </h1>

              {subtitle ? (
                <p
                  style={{
                    margin: "8px 0 0",
                    color: colors.muted,
                    fontSize: "14px",
                    lineHeight: 1.5,
                    maxWidth: "760px",
                  }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#f6f2ea",
                border: `1px solid ${colors.border}`,
                borderRadius: "999px",
                padding: "4px",
              }}
            >
              <a
                href={withLang(location.pathname, "de")}
                style={locale === "de" ? langActive : langLink}
              >
                DE
              </a>
              <a
                href={withLang(location.pathname, "en")}
                style={locale === "en" ? langActive : langLink}
              >
                EN
              </a>
            </div>
          </header>

          <main className="portal-content">{children}</main>
        </div>
      </div>
    </div>
  );
}

const sidebarPrimaryLink = {
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "14px",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  textAlign: "center",
};

const sidebarSecondaryLink = {
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "14px",
  background: "#fff",
  color: "#222",
  fontWeight: 700,
  textAlign: "center",
  border: `1px solid ${colors.border}`,
};

const langLink = {
  textDecoration: "none",
  color: "#6f6a61",
  fontWeight: 700,
  padding: "8px 12px",
  borderRadius: "999px",
};

const langActive = {
  textDecoration: "none",
  color: "#111",
  fontWeight: 800,
  padding: "8px 12px",
  borderRadius: "999px",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};