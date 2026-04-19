import { json } from "react-router";
import { prisma } from "../lib/prisma.server.js";
import { getUserFromRequest } from "../lib/auth.server.js";

function getCorsHeaders(origin) {
  const allowedOrigins = new Set([
    "https://letmebowl-catering.de",
    "https://www.letmebowl-catering.de",
  ]);

  const safeOrigin = allowedOrigins.has(origin) ? origin : "https://letmebowl-catering.de";

  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function toDecimal(valueInCents) {
  const num = Number(valueInCents || 0);
  return Number((num / 100).toFixed(2));
}

function clean(value) {
  const v = String(value ?? "").trim();
  return v || null;
}

function buildOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `LMB-${y}${m}${d}-${h}${min}${s}-${rand}`;
}

export async function loader({ request }) {
  const origin = request.headers.get("Origin") || "";
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function action({ request }) {
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return json(
        { ok: false, message: "Nicht eingeloggt." },
        { status: 401, headers: corsHeaders }
      );
    }

    const formData = await request.formData();

    const currency = String(formData.get("currency") || "EUR");
    const deliveryType = String(formData.get("deliveryType") || "").trim();

    const deliveryDate = String(formData.get("deliveryDate") || "").trim();
    const deliveryTime = String(formData.get("deliveryTime") || "").trim();
    const eventTime = String(formData.get("eventTime") || "").trim();

    const contactName = String(formData.get("contactName") || "").trim();
    const contactFirstName = String(formData.get("contactFirstName") || "").trim();
    const contactLastName = String(formData.get("contactLastName") || "").trim();
    const contactEmail = String(formData.get("contactEmail") || "").trim();
    const contactPhone = String(formData.get("contactPhone") || "").trim();

    const internalReference = String(formData.get("internalReference") || "").trim();
    const note = String(formData.get("note") || "").trim();

    const deliveryAddressId = clean(formData.get("portalDeliveryAddressId"));
    const deliveryAddressLabel = String(formData.get("portalDeliveryAddressLabel") || "").trim();
    const deliveryAddressFull = String(formData.get("portalDeliveryAddressFull") || "").trim();

    const costCenterId = clean(formData.get("portalCostCenterId"));
    const costCenterName = String(formData.get("portalCostCenterName") || "").trim();
    const costCenterCode = String(formData.get("portalCostCenterCode") || "").trim();

    const deliveryCompany = String(formData.get("deliveryCompany") || "").trim();
    const deliveryStreet = String(formData.get("deliveryStreet") || "").trim();
    const deliveryZip = String(formData.get("deliveryZip") || "").trim();
    const deliveryCity = String(formData.get("deliveryCity") || "").trim();
    const deliveryExtra = String(formData.get("deliveryExtra") || "").trim();

    const billingCompany = String(formData.get("billingCompany") || "").trim();
    const billingStreet = String(formData.get("billingStreet") || "").trim();
    const billingZip = String(formData.get("billingZip") || "").trim();
    const billingCity = String(formData.get("billingCity") || "").trim();
    const billingExtra = String(formData.get("billingExtra") || "").trim();

    const subtotalAmount = toDecimal(formData.get("subtotalAmountCents"));
    const taxAmount = toDecimal(formData.get("taxAmountCents"));
    const totalAmount = toDecimal(formData.get("totalAmountCents"));

    const rawItems = String(formData.get("items") || "[]");
    const items = JSON.parse(rawItems);

    if (!Array.isArray(items) || items.length === 0) {
      return json(
        { ok: false, message: "Keine Positionen gefunden." },
        { status: 400, headers: corsHeaders }
      );
    }

    let parsedDeliveryDate = null;
    if (deliveryDate) {
      parsedDeliveryDate = new Date(`${deliveryDate}T12:00:00`);
      if (Number.isNaN(parsedDeliveryDate.getTime())) {
        parsedDeliveryDate = null;
      }
    }

    const order = await prisma.portalOrder.create({
      data: {
        userId: user.id,
        orderNumber: buildOrderNumber(),
        orderType: deliveryType || null,
        currency: currency || "EUR",

        billingContactName: contactName || null,
        billingEmail: contactEmail || null,
        billingPhone: contactPhone || null,
        billingCompanyName: billingCompany || deliveryCompany || user.companyName || null,

        deliveryAddressId,
        costCenterId,
        referenceNumber: internalReference || null,

        subtotalAmount,
        taxAmount,
        totalAmount,

        notes: note || null,
        deliveryDate: parsedDeliveryDate,

        items: {
          create: items.map((item) => ({
            title: String(item.title || "").trim() || "Produkt",
            quantity: Number(item.quantity || 1),
            unit: clean(item.unit),
            unitPrice: item.unitPriceCents != null ? toDecimal(item.unitPriceCents) : null,
            totalPrice: item.totalPriceCents != null ? toDecimal(item.totalPriceCents) : null,
            notes: clean(item.notes),

            shopifyProductId: item.productId != null ? String(item.productId) : null,
            shopifyVariantId: item.variantId != null ? String(item.variantId) : null,
            shopifyHandle: clean(item.handle),
            variantTitle: clean(item.variantTitle),
            sku: clean(item.sku),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return json(
      {
        ok: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        meta: {
          deliveryAddressLabel,
          deliveryAddressFull,
          costCenterName,
          costCenterCode,
          contactFirstName,
          contactLastName,
          eventTime,
          deliveryTime,
          deliveryStreet,
          deliveryZip,
          deliveryCity,
          deliveryExtra,
          billingStreet,
          billingZip,
          billingCity,
          billingExtra,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("portal-order create error", error);

    return json(
      { ok: false, message: "Portal-Bestellung konnte nicht gespeichert werden." },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}