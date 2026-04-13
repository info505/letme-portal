import { useLocation } from "react-router";
import { colors } from "../lib/ui.js";

export default function LanguageSwitch() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const current = params.get("lang") || "de";

  function createHref(lang) {
    const next = new URLSearchParams(location.search);
    next.set("lang", lang);
    return `${location.pathname}?${next.toString()}`;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px",
        borderRadius: "999px",
        background: "#f7f4ee",
        border: `1px solid ${colors.border}`,
      }}
    >
      <LangPill href={createHref("de")} active={current === "de"}>
        DE
      </LangPill>
      <LangPill href={createHref("en")} active={current === "en"}>
        EN
      </LangPill>
    </div>
  );
}

function LangPill({ href, active, children }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 800,
        color: active ? "#111" : "#6d675d",
        background: active ? "#fff" : "transparent",
        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
      }}
    >
      {children}
    </a>
  );
}