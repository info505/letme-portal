import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Private server-to-server integration. Customer sessions and password hashes never cross this boundary.
export const BRIDGE_PATH = "/api/cockpit/v1";
const usedNonces = new Map();
const WINDOW_MS = 60_000;
const customerSelect = {
  id: true, companyName: true, firstName: true, lastName: true, email: true,
  username: true, phone: true, isActive: true, isAdmin: true, role: true,
  invoicePurchaseEnabled: true, mustResetPassword: true, createdAt: true, updatedAt: true,
};
const invoiceSelect = { id: true, userId: true, invoiceNumber: true, title: true,
  issueDate: true, dueDate: true, amountGross: true, status: true, updatedAt: true };
const orderSelect = { id: true, userId: true, orderNumber: true, status: true, totalAmount: true,
  currency: true, orderedAt: true, deliveryDate: true, deliveryTime: true, deliveryType: true,
  deliveryCompanyName: true, deliveryStreet: true, deliveryPostalCode: true, deliveryCity: true,
  billingCompanyName: true, billingEmail: true, customerNote: true, updatedAt: true,
  items: { select: { id: true, title: true, quantity: true, unit: true, unitPrice: true, totalPrice: true } } };

export function bridgeSignature(secret, body, timestamp, nonce) {
  const digest = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update(`v1\nPOST\n${BRIDGE_PATH}\n${timestamp}\n${nonce}\n${digest}`).digest("hex");
}

export function verifyBridgeRequest(headers, rawBody, secret, now = Date.now(), nonces = usedNonces) {
  if (!/^[a-f0-9]{64,128}$/i.test(secret || "") || !Buffer.isBuffer(rawBody) || rawBody.length > 65_536) return false;
  if (headers.origin) return false;
  const timestamp = headers["x-lmb-timestamp"], nonce = headers["x-lmb-nonce"], signature = headers["x-lmb-signature"];
  if (typeof timestamp !== "string" || !/^\d{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > WINDOW_MS ||
      typeof nonce !== "string" || !/^[a-f0-9]{48}$/.test(nonce) || typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(bridgeSignature(secret, rawBody, timestamp, nonce), "hex"))) return false;
  for (const [key, until] of nonces) if (until < now) nonces.delete(key);
  if (nonces.has(nonce) || nonces.size >= 10_000) return false;
  nonces.set(nonce, now + WINDOW_MS * 2);
  return true;
}

export class PortalBridgeError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function id(value) { if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(value)) throw new PortalBridgeError("invalid"); return value; }
function revision(value) { if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new PortalBridgeError("invalid"); return new Date(value); }
// Even two changes within one clock millisecond must invalidate the earlier form.
function nextRevision(expected) { return new Date(Math.max(Date.now(), expected.getTime() + 1)); }
function fields(source, keys) {
  if (!object(source) || Object.keys(source).some(key => !keys.includes(key))) throw new PortalBridgeError("invalid");
  return Object.fromEntries(Object.entries(source).map(([key, value]) => {
    const multiline = key === "notes" || key === "description";
    if (typeof value !== "string" || value.length > (multiline ? 4000 : 300) || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f]/ : /[\x00-\x1f]/).test(value)) throw new PortalBridgeError("invalid");
    return [key, value.trim()];
  }));
}
function page(value) { return Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100000) : 1; }
function search(value) { return typeof value === "string" ? value.trim().slice(0, 100) : ""; }
function json(value) { return JSON.parse(JSON.stringify(value)); }

export async function handlePortalBridge(db, input, env = process.env) {
  if (!object(input) || typeof input.op !== "string") throw new PortalBridgeError("invalid");
  if (input.op === "overview") {
    const [customers, active, pending, orders, invoices] = await Promise.all([
      db.portalUser.count(), db.portalUser.count({ where: { isActive: true } }),
      db.portalUser.count({ where: { isActive: false } }), db.portalOrder.count(), db.portalInvoice.count(),
    ]);
    return { customers, active, pending, orders, invoices,
      portalUrl: "https://konto.letmebowl-catering.de",
      mailProvider: env.MAIL_PROVIDER === "brevo" && env.BREVO_API_KEY ? "brevo" : "mailjet",
      brevoConfigured: Boolean(env.BREVO_API_KEY),
      preserved: ["customers", "passwords", "addresses", "orders", "invoices"] };
  }
  if (input.op === "customers") {
    const q = search(input.q), current = page(input.page);
    const where = q ? { OR: ["companyName", "firstName", "lastName", "email", "username"].map(key => ({ [key]: { contains: q, mode: "insensitive" } })) } : {};
    const [total, rows] = await Promise.all([db.portalUser.count({ where }), db.portalUser.findMany({
      where, select: customerSelect, orderBy: [{ isActive: "asc" }, { companyName: "asc" }, { id: "asc" }], skip: (current - 1) * 30, take: 30,
    })]);
    return json({ total, page: current, pages: Math.max(1, Math.ceil(total / 30)), rows });
  }
  if (input.op === "customer") {
    const customer = await db.portalUser.findUnique({ where: { id: id(input.id) }, select: {
      ...customerSelect, billing: true, addresses: { orderBy: { createdAt: "desc" } },
      contacts: { orderBy: { createdAt: "desc" } }, costCenters: { orderBy: { createdAt: "desc" } },
      orders: { select: orderSelect, orderBy: { orderedAt: "desc" }, take: 100 },
      invoices: { select: invoiceSelect, orderBy: { createdAt: "desc" }, take: 100 },
    } });
    if (!customer) throw new PortalBridgeError("missing", 404);
    return json(customer);
  }
  if (input.op === "orders" || input.op === "invoices") {
    const current = page(input.page), q = search(input.q), orders = input.op === "orders";
    const model = orders ? db.portalOrder : db.portalInvoice;
    const key = orders ? "orderNumber" : "invoiceNumber";
    const where = q ? { OR: [{ [key]: { contains: q, mode: "insensitive" } }, { user: { companyName: { contains: q, mode: "insensitive" } } }] } : {};
    const [total, rows] = await Promise.all([model.count({ where }), model.findMany({
      where, select: { ...(orders ? orderSelect : invoiceSelect), user: { select: { companyName: true, firstName: true, lastName: true, isAdmin: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (current - 1) * 30, take: 30,
    })]);
    return json({ total, page: current, pages: Math.max(1, Math.ceil(total / 30)), rows });
  }
  if (input.op === "update_customer") {
    const userId = id(input.id), expected = revision(input.expectedUpdatedAt);
    const data = fields(input.fields, ["companyName", "firstName", "lastName", "phone"]);
    if (!data.companyName || !data.firstName) throw new PortalBridgeError("invalid");
    if (typeof input.isActive !== "boolean" || typeof input.invoicePurchaseEnabled !== "boolean") throw new PortalBridgeError("invalid");
    return db.$transaction(async tx => {
      const result = await tx.portalUser.updateMany({ where: { id: userId, updatedAt: expected, isAdmin: false },
        data: { ...data, isActive: input.isActive, invoicePurchaseEnabled: input.invoicePurchaseEnabled, updatedAt: nextRevision(expected) } });
      if (result.count !== 1) throw new PortalBridgeError("stale_or_admin", 409);
      return { ok: true };
    });
  }
  if (["save_billing", "save_address", "save_contact", "save_cost_center"].includes(input.op)) {
    const userId = id(input.id), expected = revision(input.expectedUpdatedAt);
    const recordId = input.recordId ? id(input.recordId) : null;
    const recordRevision = recordId ? revision(input.expectedRecordUpdatedAt) : null;
    if (!recordId && input.expectedRecordUpdatedAt) throw new PortalBridgeError("invalid");
    const allowed = input.op === "save_billing" ? ["companyName", "contactName", "email", "phone", "street", "houseNumber", "postalCode", "city", "country", "vatId", "invoiceEmail"]
      : input.op === "save_address" ? ["label", "companyName", "contactName", "phone", "street", "houseNumber", "postalCode", "city", "country", "notes"]
      : input.op === "save_contact" ? ["firstName", "lastName", "email", "phone", "roleLabel", "department"] : ["name", "code", "description"];
    const data = fields(input.fields, allowed);
    if (input.op === "save_address" && (!data.street || !data.postalCode || !data.city || !data.country)) throw new PortalBridgeError("invalid");
    if (input.op === "save_contact" && (!data.firstName || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(data.email || ""))) throw new PortalBridgeError("invalid");
    if (input.op === "save_cost_center" && !data.name) throw new PortalBridgeError("invalid");
    if (input.op === "save_billing" && [data.email, data.invoiceEmail].some(value => value && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value))) throw new PortalBridgeError("invalid");
    return db.$transaction(async tx => {
      const locked = await tx.portalUser.updateMany({ where: { id: userId, updatedAt: expected, isAdmin: false }, data: { updatedAt: nextRevision(expected) } });
      if (locked.count !== 1) throw new PortalBridgeError("stale_or_admin", 409);
      const model = input.op === "save_billing" ? tx.billingProfile : input.op === "save_address" ? tx.deliveryAddress : input.op === "save_contact" ? tx.portalContact : tx.costCenter;
      if (recordId) {
        // Customers can edit these records without touching PortalUser.updatedAt.
        const changed = await model.updateMany({ where: { id: recordId, userId, updatedAt: recordRevision },
          data: { ...data, updatedAt: nextRevision(recordRevision) } });
        if (changed.count !== 1) throw new PortalBridgeError("stale_or_admin", 409);
      } else {
        try { await model.create({ data: { userId, ...data } }); }
        catch (error) {
          // A concurrently created billing profile must not be silently overwritten by upsert.
          if (input.op === "save_billing" && error?.code === "P2002") throw new PortalBridgeError("stale_or_admin", 409);
          throw error;
        }
      }
      return { ok: true };
    });
  }
  if (input.op === "update_order" || input.op === "update_invoice") {
    const order = input.op === "update_order";
    const statuses = order ? ["OPEN", "CONFIRMED", "IN_PREPARATION", "DELIVERED", "CANCELLED"] : ["OFFEN", "BEZAHLT", "UEBERFAELLIG"];
    if (!statuses.includes(input.status)) throw new PortalBridgeError("invalid");
    const expected = revision(input.expectedUpdatedAt);
    const result = await (order ? db.portalOrder : db.portalInvoice).updateMany({
      where: { id: id(input.id), updatedAt: expected, user: { is: { isAdmin: false } } }, data: { status: input.status, updatedAt: nextRevision(expected) },
    });
    if (result.count !== 1) throw new PortalBridgeError("stale_or_admin", 409);
    return { ok: true };
  }
  // There are deliberately no bulk rewrite, delete, password, role or administrator mutations.
  throw new PortalBridgeError("unsupported", 400);
}

export function registerCockpitBridge(app, express, prisma, env = process.env) {
  app.post(BRIDGE_PATH, express.raw({ type: "application/json", limit: "64kb" }), async (req, res) => {
    res.set({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" });
    if (!verifyBridgeRequest(req.headers, req.body, env.PORTAL_COCKPIT_BRIDGE_SECRET)) return res.status(401).json({ error: "unauthorized" });
    try {
      const input = JSON.parse(req.body.toString("utf8"));
      const result = await handlePortalBridge(prisma, input, env);
      if (/^(update_|save_)/.test(input.op)) console.info("PORTAL_COCKPIT_CHANGE", input.op);
      return res.json({ ok: true, result });
    } catch (error) {
      const known = error instanceof PortalBridgeError;
      if (!known) console.error("PORTAL_COCKPIT_ERROR", error?.name || "unknown");
      return res.status(known ? error.status : 500).json({ error: known ? error.code : "unavailable" });
    }
  });
}
