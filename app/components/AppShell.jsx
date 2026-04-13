import { Outlet, useSearchParams } from "react-router";
import Topbar from "./Topbar";
import { layout } from "../lib/ui";
import { dict } from "../lib/i18n";

export default function AppShell() {
  const [params] = useSearchParams();
  const locale = params.get("lang") || "de";
  const t = dict[locale];

  return (
    <div style={layout.page}>
      <Topbar />

      <div style={layout.container}>
        <Outlet context={{ t, locale }} />
      </div>
    </div>
  );
}