import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import "./styles/portal-design.css";

export function loader({ request }) {
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "de";
  return { locale };
}

export function meta() {
  return [{ title: "Let Me Bowl | Kundenportal" }, { name: "robots", content: "noindex,nofollow" }];
}

export default function App() {
  const { locale = "de" } = useLoaderData() || {};
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#234c30" />
        <link rel="icon" type="image/webp" href="/brand/let-me-bowl-logo.webp" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
