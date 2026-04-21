import { redirect } from "react-router";
import { getUserFromRequest } from "../../lib/auth.server.js";

export async function loader({ request }) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw redirect("/login");
  }

  // ADMIN → direkt ins Admin Panel
  if (user.isAdmin) {
    throw redirect("/admin/customers");
  }

  return { user };
}

export default function App() {
  return null;
}