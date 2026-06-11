import { redirect } from "react-router";
import { destroySessionFromRequest } from "../lib/auth.server.js";
import { getLocaleFromRequest } from "../lib/i18n.js";

export async function loader({ request }) {
  const locale = getLocaleFromRequest(request);
  const cookies = await destroySessionFromRequest(request);

  const headers = new Headers();

  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }

  return redirect(`/login?lang=${locale}`, {
    headers,
  });
}

export default function LogoutPage() {
  return null;
}