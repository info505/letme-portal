import { redirect } from "react-router";
import { getLocaleFromRequest } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  throw redirect(`/rechnungsadresse?lang=${locale}`);
}

export default function AdressenRedirectPage() {
  return null;
}