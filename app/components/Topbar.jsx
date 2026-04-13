import { useLoaderData, useLocation } from "react-router";
import LanguageSwitch from "./LanguageSwitch";
import { colors } from "../lib/ui.js";
import { dict, withLang } from "../lib/i18n.js";

export default function Topbar() {
  const location = useLocation();
  const data = useLoaderData?.() || {};
  const locale = data?.locale || new URLSearchParams(location.search).get("lang") || "de";
  const user = data?.user || null;
  const t = dict[locale] || dict.de;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", minWidth: 0 }}>
          <a
            href="https://letmebowl-catering.de"
            style={{
              textDecoration: "none",
              color: colors.text,
              fontWeight: 800,
              letterSpacing: "0.08em",
              fontSize: "15px",
              whiteSpace: "nowrap",
            }}
          >
            LET ME BOWL
          </a>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <TopbarLink
              href={withLang("/dashboard", locale)}
              label={t.account}
              active={isActive(location.pathname, "/dashboard")}
            />
            <TopbarLink
              href={withLang("/adressen", locale)}
              label={t.addresses}
              active={isActive(location.pathname, "/adressen")}
            />
            <TopbarLink
              href={withLang("/rechnungen", locale)}
              label={t.invoices}
              active={isActive(location.pathname, "/rechnungen")}
            />
          </nav>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <LanguageSwitch />

          {user ? (
            <details style={{ position: "relative" }}>
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "10px 14px",
                  minWidth: "170px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "999px",
                      background: "#f3eee4",
                      border: `1px solid #e8dcc2`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#8d6a2f",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(user)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: colors.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.firstName || user.username || "Account"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: colors.muted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.companyName || user.email || ""}
                    </div>
                  </div>

                  <span style={{ color: colors.muted, fontSize: "12px" }}>▾</span>
                </div>
              </summary>

              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: "250px",
                  background: "#fff",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "18px",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    padding: "12px 12px 14px",
                    borderBottom: `1px solid ${colors.border}`,
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: colors.text, fontSize: "14px" }}>
                    {fullName(user) || user.username || "User"}
                  </div>
                  <div style={{ color: colors.muted, fontSize: "13px", marginTop: "4px" }}>
                    {user.email || ""}
                  </div>
                </div>

                <DropdownLink
                  href={withLang("/dashboard", locale)}
                  label={t.account}
                  active={isActive(location.pathname, "/dashboard")}
                />
                <DropdownLink
                  href={withLang("/adressen", locale)}
                  label={t.addresses}
                  active={isActive(location.pathname, "/adressen")}
                />
                <DropdownLink
                  href={withLang("/rechnungen", locale)}
                  label={t.invoices}
                  active={isActive(location.pathname, "/rechnungen")}
                />
                <DropdownLink
                  href="https://letmebowl-catering.de"
                  label={t.homepage}
                />
                <DropdownLink
                  href="https://letmebowl-catering.de"
                  label={t.orderNow}
                />

                <div
                  style={{
                    height: "1px",
                    background: colors.border,
                    margin: "8px 0",
                  }}
                />

                <a
                  href={withLang("/logout", locale)}
                  style={{
                    display: "block",
                    padding: "12px 12px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: "#8b2222",
                    fontWeight: 700,
                  }}
                >
                  {t.logout}
                </a>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function TopbarLink({ href, label, active = false }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: active ? colors.text : colors.muted,
        fontWeight: active ? 700 : 600,
        padding: "10px 12px",
        borderRadius: "12px",
        background: active ? "#f6f1e8" : "transparent",
        border: active ? "1px solid #eadfc8" : "1px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </a>
  );
}

function DropdownLink({ href, label, active = false }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        color: active ? colors.text : "#222",
        fontWeight: active ? 700 : 600,
        padding: "12px",
        borderRadius: "12px",
        background: active ? "#f6f1e8" : "transparent",
      }}
    >
      {label}
    </a>
  );
}

function isActive(pathname, target) {
  return pathname === target;
}

function getInitials(user) {
  const a = user?.firstName?.[0] || "";
  const b = user?.lastName?.[0] || "";
  const c = user?.username?.[0] || "";
  return (a + b || c || "A").toUpperCase();
}

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
}