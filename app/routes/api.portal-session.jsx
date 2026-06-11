import { getUserFromRequest } from "../lib/auth.server.js";

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://letmebowl-catering.de",
  "https://www.letmebowl-catering.de",
  "https://ab3d1f.myshopify.com",
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;

  if (EXACT_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    return (
      hostname === "letmebowl-catering.de" ||
      hostname.endsWith(".letmebowl-catering.de") ||
      hostname.endsWith(".myshopify.com") ||
      hostname.endsWith(".shopifypreview.com")
    );
  } catch {
    return false;
  }
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : "";

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Vary": "Origin",
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Accept";
  }

  return headers;
}

export async function loader({ request }) {
  const headers = getCorsHeaders(request);

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

export async function action({ request }) {
  const headers = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "Method not allowed",
    }),
    {
      status: 405,
      headers,
    }
  );
}