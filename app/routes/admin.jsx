import { Outlet, redirect } from "react-router";
import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  if (!user.isAdmin) {
    throw redirect("/dashboard");
  }

  return { user };
}

export default function AdminRouteLayout() {
  return <Outlet />;
}