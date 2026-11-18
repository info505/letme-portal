import { Outlet, useSearchParams } from "react-router";
import Topbar from "./Topbar.jsx";
import { dict } from "../lib/i18n.js";
export default function AppShell() {
  const [params] = useSearchParams();
  const locale = params.get("lang") === "en" ? "en" : "de";
  return <div><Topbar /><main className="lmb-portal-standalone" id="portal-content"><Outlet context={{ t: dict[locale], locale }} /></main></div>;
}
