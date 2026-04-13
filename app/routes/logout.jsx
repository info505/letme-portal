import { redirect } from "react-router";

export async function loader() {
  return redirect("/login", {
    headers: {
      "Set-Cookie":
        "lmb_portal_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}

export default function LogoutPage() {
  return null;
}