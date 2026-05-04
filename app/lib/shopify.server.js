// app/lib/shopify.server.js

const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function cleanString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeEmail(email) {
  return cleanString(email).toLowerCase();
}

function normalizePhone(phone) {
  const value = cleanString(phone);
  return value || "";
}

function splitName(user) {
  const fullName = cleanString(user.name);
  const fullNameParts = fullName.split(" ").filter(Boolean);

  const firstName =
    cleanString(user.firstName) ||
    cleanString(user.vorname) ||
    fullNameParts[0] ||
    "";

  const lastName =
    cleanString(user.lastName) ||
    cleanString(user.nachname) ||
    fullNameParts.slice(1).join(" ") ||
    "";

  return {
    firstName,
    lastName,
  };
}

function getCompanyName(user) {
  return (
    cleanString(user.companyName) ||
    cleanString(user.company) ||
    cleanString(user.firma) ||
    cleanString(user.businessName) ||
    ""
  );
}

function getBillingInfo(user) {
  const parts = [];

  if (user.billingAddress) parts.push(`Rechnungsadresse: ${cleanString(user.billingAddress)}`);
  if (user.billingStreet) parts.push(`Straße: ${cleanString(user.billingStreet)}`);
  if (user.billingZip) parts.push(`PLZ: ${cleanString(user.billingZip)}`);
  if (user.billingCity) parts.push(`Ort: ${cleanString(user.billingCity)}`);
  if (user.billingCountry) parts.push(`Land: ${cleanString(user.billingCountry)}`);

  if (user.address) parts.push(`Adresse: ${cleanString(user.address)}`);
  if (user.street) parts.push(`Straße: ${cleanString(user.street)}`);
  if (user.zip) parts.push(`PLZ: ${cleanString(user.zip)}`);
  if (user.city) parts.push(`Ort: ${cleanString(user.city)}`);

  return parts.filter(Boolean).join("\n");
}

function buildCustomerNote(user) {
  const companyName = getCompanyName(user);
  const billingInfo = getBillingInfo(user);

  const lines = [
    "Automatisch angelegt über Let Me Bowl Kundenkonto.",
    "",
    companyName ? `Firma: ${companyName}` : "",
    billingInfo ? billingInfo : "",
    "",
    "Status: Rechnungskauf noch nicht freigegeben.",
    "Bitte Kundendaten prüfen und danach Tag rechnung_freigegeben setzen.",
  ];

  return lines.filter(Boolean).join("\n");
}

function buildTags(user) {
  const companyName = getCompanyName(user);

  const tags = ["kundenportal", "rechnung_pruefung"];

  if (companyName) {
    tags.push("firmenkunde");
  }

  return tags;
}

function assertShopifyEnv() {
  if (!SHOPIFY_SHOP_DOMAIN) {
    throw new Error("SHOPIFY_SHOP_DOMAIN fehlt in den ENV-Variablen.");
  }

  if (!SHOPIFY_CLIENT_ID) {
    throw new Error("SHOPIFY_CLIENT_ID fehlt in den ENV-Variablen.");
  }

  if (!SHOPIFY_CLIENT_SECRET) {
    throw new Error("SHOPIFY_CLIENT_SECRET fehlt in den ENV-Variablen.");
  }
}

async function getShopifyAccessToken() {
  assertShopifyEnv();

  const now = Date.now();

  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60 * 1000) {
    return cachedAccessToken;
  }

  const tokenUrl = `https://${SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
    }),
  });

  const rawText = await response.text();

  let json = null;

  try {
    json = JSON.parse(rawText);
  } catch (parseError) {
    console.error("Shopify Token Antwort war kein JSON.");
    console.error("Shopify Token Status:", response.status);
    console.error("Shopify Token URL:", tokenUrl);
    console.error("Shopify Token Antwort:", rawText.slice(0, 1000));

    throw new Error(
      "Shopify Access Token konnte nicht erzeugt werden: Antwort war kein JSON."
    );
  }

  if (!response.ok || !json.access_token) {
    console.error("Shopify Token Fehler:", JSON.stringify(json, null, 2));
    console.error("Shopify Token Status:", response.status);

    throw new Error("Shopify Access Token konnte nicht erzeugt werden.");
  }

  cachedAccessToken = json.access_token;

  const expiresInSeconds = Number(json.expires_in || 1200);
  cachedAccessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;

  return cachedAccessToken;
}

async function shopifyGraphql(query, variables = {}) {
  assertShopifyEnv();

  const accessToken = await getShopifyAccessToken();

  const response = await fetch(
    `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    }
  );

  const rawText = await response.text();

  let json = null;

  try {
    json = JSON.parse(rawText);
  } catch (parseError) {
    console.error("Shopify GraphQL Antwort war kein JSON.");
    console.error("Shopify GraphQL Status:", response.status);
    console.error("Shopify GraphQL Antwort:", rawText.slice(0, 1000));

    throw new Error(
      "Shopify GraphQL Request fehlgeschlagen: Antwort war kein JSON."
    );
  }

  if (!response.ok || json.errors) {
    console.error("Shopify GraphQL Fehler:", JSON.stringify(json, null, 2));
    console.error("Shopify GraphQL Status:", response.status);

    throw new Error("Shopify GraphQL Request fehlgeschlagen.");
  }

  return json.data;
}

function escapeShopifyQueryValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function findShopifyCustomerByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return null;

  const query = `
    query FindCustomerByEmail($query: String!) {
      customers(first: 1, query: $query) {
        edges {
          node {
            id
            email
            phone
            firstName
            lastName
            tags
          }
        }
      }
    }
  `;

  const data = await shopifyGraphql(query, {
    query: `email:"${escapeShopifyQueryValue(normalizedEmail)}"`,
  });

  const edge = data?.customers?.edges?.[0];

  return edge?.node || null;
}

export async function createShopifyCustomer(user) {
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  const { firstName, lastName } = splitName(user);
  const tags = buildTags(user);
  const note = buildCustomerNote(user);

  if (!email) {
    throw new Error("Shopify-Kunde kann nicht angelegt werden: E-Mail fehlt.");
  }

  const mutation = `
    mutation CustomerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          phone
          firstName
          lastName
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: phone || undefined,
    tags,
    note,
  };

  const data = await shopifyGraphql(mutation, { input });

  const errors = data?.customerCreate?.userErrors || [];

  if (errors.length) {
    console.error("Shopify customerCreate Fehler:", JSON.stringify(errors, null, 2));
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return data.customerCreate.customer;
}

export async function updateShopifyCustomer(customerId, user) {
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  const { firstName, lastName } = splitName(user);
  const note = buildCustomerNote(user);

  if (!customerId) {
    throw new Error("Shopify-Kunde kann nicht aktualisiert werden: customerId fehlt.");
  }

  const mutation = `
    mutation CustomerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          email
          phone
          firstName
          lastName
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const input = {
    id: customerId,
    email: email || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: phone || undefined,
    note,
  };

  const data = await shopifyGraphql(mutation, { input });

  const errors = data?.customerUpdate?.userErrors || [];

  if (errors.length) {
    console.error("Shopify customerUpdate Fehler:", JSON.stringify(errors, null, 2));
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return data.customerUpdate.customer;
}

export async function addTagsToShopifyCustomer(customerId, tags) {
  if (!customerId) return null;
  if (!tags || !tags.length) return null;

  const mutation = `
    mutation TagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphql(mutation, {
    id: customerId,
    tags,
  });

  const errors = data?.tagsAdd?.userErrors || [];

  if (errors.length) {
    console.error("Shopify tagsAdd Fehler:", JSON.stringify(errors, null, 2));
    throw new Error(errors.map((error) => error.message).join(", "));
  }

  return true;
}

export async function syncCustomerToShopify(user) {
  const email = normalizeEmail(user.email);

  if (!email) {
    throw new Error("Shopify-Sync nicht möglich: E-Mail fehlt.");
  }

  const tags = buildTags(user);

  const existingCustomer = await findShopifyCustomerByEmail(email);

  if (existingCustomer?.id) {
    const updatedCustomer = await updateShopifyCustomer(existingCustomer.id, user);
    await addTagsToShopifyCustomer(existingCustomer.id, tags);

    console.log("Shopify Kunde aktualisiert:", updatedCustomer.id);

    return {
      action: "updated",
      customer: updatedCustomer,
    };
  }

  const createdCustomer = await createShopifyCustomer(user);

  console.log("Shopify Kunde angelegt:", createdCustomer.id);

  return {
    action: "created",
    customer: createdCustomer,
  };
}