import { redirect } from "react-router";
import { destroySessionFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);

  const cookie = await destroySessionFromRequest(request);

  return redirect(`/login?lang=${locale}`, {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}

export default function LogoutPage() {
  return null;
}