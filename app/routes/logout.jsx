import { redirect } from "react-router";
import { getLocaleFromRequest } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);

  return redirect(`/login?lang=${locale}`, {
    headers: {
      "Set-Cookie":
        "lmb_portal_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}

export default function LogoutPage() {
  return null;
}