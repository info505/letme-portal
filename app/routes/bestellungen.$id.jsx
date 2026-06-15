import { redirect } from "react-router";
import { getLocaleFromRequest } from "../lib/i18n.js";

export async function loader({ request, params }) {
  const locale = getLocaleFromRequest(request);
  const id = encodeURIComponent(String(params.id || ""));
  throw redirect(`/bestellungen?detail=${id}&lang=${locale}`);
}

export default function RedirectOrderDetail() {
  return null;
}