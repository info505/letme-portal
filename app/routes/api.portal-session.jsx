import { getUserFromRequest } from "../lib/auth.server.js";

export async function loader({ request }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return new Response(
        JSON.stringify({
          ok: true,
          loggedIn: false,
          user: null,
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        loggedIn: true,
        user: {
          id: user.id,
          companyName: user.companyName || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          username: user.username || "",
          phone: user.phone || "",
          isActive: Boolean(user.isActive),
          invoicePurchaseEnabled: Boolean(user.invoicePurchaseEnabled),
        },
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error("Portal session API error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        loggedIn: false,
        user: null,
        error: "Die Sitzung konnte nicht geprüft werden.",
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

