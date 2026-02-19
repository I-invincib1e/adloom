import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import premiumStyles from "./styles/premium.css?url";

export const links = () => [
  { rel: "stylesheet", href: premiumStyles },
];

export const loader = async ({ request }) => {
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export const headers = (headersArgs) => boundary.headers(headersArgs);

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <meta name="shopify-api-key" content={apiKey} />
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

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
