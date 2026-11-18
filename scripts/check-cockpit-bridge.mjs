/** Local synthetic-data checks only: never opens a database or contacts a service. */
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { bridgeSignature, verifyBridgeRequest, handlePortalBridge, PortalBridgeError } from "../app/lib/cockpit-bridge.server.js";

const models = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const old = new Date("2026-11-18T12:00:00.000Z"), newer = new Date("2026-11-18T12:01:00.000Z");
function mockDatabase() {
  const customer = { id: "customer_one", companyName: "Example Company", firstName: "Sample", lastName: "Person", email: "sample@example.test", username: "sample-user", phone: null,
    isActive: true, isAdmin: false, role: "ORDERER", invoicePurchaseEnabled: false, mustResetPassword: false, passwordHash: "PRIVATE_HASH_SENTINEL", createdAt: old, updatedAt: old };
  let state = {
    PortalUser: [customer, { ...customer, id: "admin_user", isAdmin: true, role: "ADMIN" }, { ...customer, id: "other_customer" }],
    BillingProfile: [{ id: "billing_one", userId: customer.id, companyName: "Existing billing", invoiceEmail: "billing@example.test", createdAt: old, updatedAt: old }],
    DeliveryAddress: [{ id: "address_one", userId: customer.id, street: "Example street", postalCode: "12345", city: "Example city", country: "DE", notes: "Existing note", createdAt: old, updatedAt: old }],
    PortalContact: [{ id: "contact_one", userId: customer.id, firstName: "Contact", email: "contact@example.test", isActive: true, isPrimary: true, createdAt: old, updatedAt: old }],
    CostCenter: [{ id: "costcenter_one", userId: customer.id, name: "Existing cost center", isActive: true, createdAt: old, updatedAt: old }],
    PortalOrder: [{ id: "order_one", userId: customer.id, orderNumber: "EXAMPLE-1", status: "OPEN", totalAmount: "10.00", currency: "EUR", orderedAt: old, createdAt: old, updatedAt: old, rawPayload: { private: "PAYLOAD_SENTINEL" }, shopifyCartToken: "TOKEN_SENTINEL" },
      { id: "order_admin", userId: "admin_user", orderNumber: "EXAMPLE-ADMIN", status: "OPEN", totalAmount: "20.00", currency: "EUR", orderedAt: old, createdAt: old, updatedAt: old }],
    PortalOrderItem: [{ id: "item_one", orderId: "order_one", title: "Example item", quantity: 1, unitPrice: "10.00", totalPrice: "10.00", rawPayload: "ITEM_PRIVATE_SENTINEL" }],
    PortalInvoice: [{ id: "invoice_one", userId: customer.id, invoiceNumber: "EXAMPLE-INVOICE", status: "OFFEN", amountGross: "10.00", pdfUrl: "PRIVATE_FILE_SENTINEL", createdAt: old, updatedAt: old },
      { id: "invoice_admin", userId: "admin_user", invoiceNumber: "EXAMPLE-ADMIN", status: "OFFEN", amountGross: "20.00", createdAt: old, updatedAt: old }],
    PortalSession: [{ id: "session_one", userId: customer.id, sessionToken: "SESSION_SENTINEL" }],
    PasswordResetToken: [{ id: "reset_one", userId: customer.id, tokenHash: "RESET_SENTINEL" }],
  };
  const writes = [];
  function related(type, row, field) {
    const schema = models.get(type).fields.find(value => value.name === field);
    assert.equal(schema.kind, "object");
    const candidates = state[schema.type] || [];
    const rows = field === "user" ? candidates.filter(value => value.id === row.userId)
      : field === "items" ? candidates.filter(value => value.orderId === row.id) : candidates.filter(value => value.userId === row.id);
    return { schema, rows };
  }
  function matches(type, row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR") return value.some(part => matches(type, row, part));
      const field = models.get(type).fields.find(item => item.name === key); assert.ok(field, `${type}.${key} exists`);
      if (field.kind === "object") return related(type, row, key).rows.some(item => matches(field.type, item, value.is || value));
      if (value instanceof Date) return row[key]?.getTime() === value.getTime();
      if (value && typeof value === "object" && "contains" in value) return String(row[key] || "").toLowerCase().includes(value.contains.toLowerCase());
      return row[key] === value;
    });
  }
  function project(type, row, select) {
    if (!select) return structuredClone(row);
    return Object.fromEntries(Object.entries(select).filter(([, spec]) => spec).map(([key, spec]) => {
      const field = models.get(type).fields.find(item => item.name === key); assert.ok(field, `${type}.${key} exists in Prisma`);
      if (field.kind !== "object") return [key, row[key] ?? null];
      const relation = related(type, row, key), rows = relation.rows.slice(0, spec.take || relation.rows.length).map(item => project(field.type, item, spec.select));
      return [key, field.isList ? rows : rows[0] ?? null];
    }));
  }
  const db = {};
  for (const type of Object.keys(state)) {
    const key = type[0].toLowerCase() + type.slice(1);
    db[key] = {
      async count(args = {}) { return state[type].filter(row => matches(type, row, args.where)).length; },
      async findMany(args = {}) { return state[type].filter(row => matches(type, row, args.where)).slice(args.skip || 0, (args.skip || 0) + (args.take || Infinity)).map(row => project(type, row, args.select)); },
      async findUnique(args) { const row = state[type].find(value => matches(type, value, args.where)); return row ? project(type, row, args.select) : null; },
      async updateMany({ where, data }) {
        for (const key of Object.keys(data)) assert.ok(models.get(type).fields.some(field => field.name === key), `${type}.${key} writable field exists`);
        let count = 0; for (const row of state[type]) if (matches(type, row, where)) { Object.assign(row, data); count++; }
        writes.push({ type, fields: Object.keys(data), count }); return { count };
      },
      async create({ data }) {
        if (type === "BillingProfile" && state[type].some(row => row.userId === data.userId)) throw Object.assign(new Error("unique"), { code: "P2002" });
        const row = { id: "new_record_id", ...data, createdAt: new Date(), updatedAt: new Date() }; state[type].push(row); writes.push({ type, fields: Object.keys(data), count: 1 }); return row;
      },
    };
  }
  db.$transaction = async run => { const before = structuredClone(state); try { return await run(db); } catch (error) { state = before; throw error; } };
  return { db, state: () => state, writes };
}
let checks = 0;
async function test(name, run) { await run(); console.log(`PASS ${++checks}: ${name}`); }
const rejected = (run, code = "invalid") => assert.rejects(run, error => error instanceof PortalBridgeError && error.code === code);

await test("signature authenticates the exact body and rejects replay, tampering, stale/future time and browser origins", () => {
  const secret = "c".repeat(64), raw = Buffer.from('{"op":"overview"}'), now = Date.now(), timestamp = String(now), nonce = "a1".repeat(24);
  const headers = { "x-lmb-timestamp": timestamp, "x-lmb-nonce": nonce, "x-lmb-signature": bridgeSignature(secret, raw, timestamp, nonce) };
  const used = new Map(); assert.equal(verifyBridgeRequest(headers, raw, secret, now, used), true); assert.equal(verifyBridgeRequest(headers, raw, secret, now, used), false);
  assert.equal(verifyBridgeRequest(headers, Buffer.from('{"op":"customers"}'), secret, now, new Map()), false);
  assert.equal(verifyBridgeRequest(headers, raw, secret, now + 60_001, new Map()), false);
  assert.equal(verifyBridgeRequest(headers, raw, secret, now - 60_001, new Map()), false);
  assert.equal(verifyBridgeRequest({ ...headers, origin: "https://konto.letmebowl-catering.de" }, raw, secret, now, new Map()), false);
  assert.equal(verifyBridgeRequest(headers, raw, "weak", now, new Map()), false);
  assert.equal(verifyBridgeRequest(headers, Buffer.alloc(65_537), secret, now, new Map()), false);
});
await test("customer and commerce reads use actual Prisma fields without hashes, sessions, reset tokens, raw payloads or PDF paths", async () => {
  const { db } = mockDatabase();
  for (const input of [{ op: "customers" }, { op: "customer", id: "customer_one" }, { op: "orders" }, { op: "invoices" }]) {
    const result = JSON.stringify(await handlePortalBridge(db, input));
    for (const secret of ["PRIVATE_HASH_SENTINEL", "SESSION_SENTINEL", "RESET_SENTINEL", "PAYLOAD_SENTINEL", "TOKEN_SENTINEL", "ITEM_PRIVATE_SENTINEL", "PRIVATE_FILE_SENTINEL"]) assert.ok(!result.includes(secret), secret);
    for (const field of ["passwordHash", "authSessions", "resetTokens", "rawPayload", "pdfUrl"]) assert.ok(!result.includes(`"${field}"`), field);
  }
});
await test("unsupported destructive and authentication operations cannot write", async () => {
  const { db, writes } = mockDatabase();
  for (const op of ["delete_customer", "reset_password", "update_role", "create_admin", "bulk_rewrite", "login"]) await rejected(() => handlePortalBridge(db, { op }), "unsupported");
  assert.equal(writes.length, 0);
});
const userInput = { op: "update_customer", id: "customer_one", expectedUpdatedAt: old.toISOString(), fields: { companyName: "Updated company", firstName: "Sample", lastName: "Person", phone: "123" }, isActive: true, invoicePurchaseEnabled: true };
await test("customer edits preserve credentials and roles, reject privileged field injection and stale/admin changes", async () => {
  const first = mockDatabase(); await handlePortalBridge(first.db, userInput);
  const row = first.state().PortalUser[0]; assert.equal(row.companyName, "Updated company"); assert.equal(row.passwordHash, "PRIVATE_HASH_SENTINEL"); assert.equal(row.email, "sample@example.test"); assert.equal(row.role, "ORDERER"); assert.equal(row.isAdmin, false); assert.ok(row.updatedAt > old);
  await rejected(() => handlePortalBridge(first.db, userInput), "stale_or_admin");
  const admin = mockDatabase(); await rejected(() => handlePortalBridge(admin.db, { ...userInput, id: "admin_user" }), "stale_or_admin");
  for (const key of ["passwordHash", "isAdmin", "role", "email", "username", "id", "userId"]) await rejected(() => handlePortalBridge(mockDatabase().db, { ...userInput, fields: { ...userInput.fields, [key]: "injected" } }));
});
const addressInput = { op: "save_address", id: "customer_one", recordId: "address_one", expectedUpdatedAt: old.toISOString(), expectedRecordUpdatedAt: old.toISOString(), fields: { street: "Updated street", postalCode: "12345", city: "Example city", country: "DE" } };
await test("editing a child requires its current revision and ownership; customer edits outside Cockpit are not overwritten", async () => {
  const stale = mockDatabase(); stale.state().DeliveryAddress[0].updatedAt = newer;
  await rejected(() => handlePortalBridge(stale.db, addressInput), "stale_or_admin");
  assert.equal(stale.state().DeliveryAddress[0].street, "Example street"); assert.equal(stale.state().PortalUser[0].updatedAt.toISOString(), old.toISOString());
  const wrongOwner = mockDatabase(); await rejected(() => handlePortalBridge(wrongOwner.db, { ...addressInput, id: "other_customer" }), "stale_or_admin");
  await rejected(() => handlePortalBridge(mockDatabase().db, { ...addressInput, expectedRecordUpdatedAt: "" }));
  const valid = mockDatabase(); await handlePortalBridge(valid.db, addressInput); assert.equal(valid.state().DeliveryAddress[0].street, "Updated street"); assert.equal(valid.state().DeliveryAddress[0].notes, "Existing note");
});
await test("concurrent billing creation fails instead of upserting over an existing billing profile", async () => {
  const b = mockDatabase(); await rejected(() => handlePortalBridge(b.db, { op: "save_billing", id: "customer_one", expectedUpdatedAt: old.toISOString(), recordId: "", fields: { companyName: "Attempted overwrite" } }), "stale_or_admin");
  assert.equal(b.state().BillingProfile[0].companyName, "Existing billing"); assert.equal(b.state().PortalUser[0].updatedAt.toISOString(), old.toISOString());
});
await test("billing/contact/cost-center edits retain IDs and flags and reject stale revisions", async () => {
  for (const [op, type, recordId, fields] of [
    ["save_billing", "BillingProfile", "billing_one", { companyName: "Updated", invoiceEmail: "invoice@example.test" }],
    ["save_contact", "PortalContact", "contact_one", { firstName: "Updated", email: "contact@example.test" }],
    ["save_cost_center", "CostCenter", "costcenter_one", { name: "Updated" }],
  ]) {
    const b = mockDatabase(), input = { op, id: "customer_one", recordId, fields, expectedUpdatedAt: old.toISOString(), expectedRecordUpdatedAt: old.toISOString() };
    await handlePortalBridge(b.db, input); const saved = b.state()[type][0]; assert.equal(saved.id, recordId); assert.equal(saved.userId, "customer_one");
    if (type !== "BillingProfile") assert.equal(saved.isActive, true);
    await rejected(() => handlePortalBridge(b.db, input), "stale_or_admin");
  }
});
await test("administrator accounts are read-only for all child records", async () => {
  for (const [op, fields] of [["save_billing", {}], ["save_address", { street: "Street", postalCode: "12345", city: "City", country: "DE" }], ["save_contact", { firstName: "Contact", email: "contact@example.test" }], ["save_cost_center", { name: "Cost center" }]]) {
    const b = mockDatabase(); await rejected(() => handlePortalBridge(b.db, { op, id: "admin_user", expectedUpdatedAt: old.toISOString(), fields }), "stale_or_admin");
    assert.equal(b.writes.filter(write => write.count > 0).length, 0);
  }
});
await test("order/invoice status edits require current revisions and non-admin ownership; amounts/items remain untouched", async () => {
  for (const [op, type, id, status] of [["update_order", "PortalOrder", "order_one", "CONFIRMED"], ["update_invoice", "PortalInvoice", "invoice_one", "BEZAHLT"]]) {
    const b = mockDatabase(), input = { op, id, status, expectedUpdatedAt: old.toISOString() };
    await handlePortalBridge(b.db, input); assert.equal(b.state()[type][0].status, status); assert.equal(b.state().PortalOrder[0].totalAmount, "10.00"); assert.equal(b.state().PortalOrderItem[0].quantity, 1);
    await rejected(() => handlePortalBridge(b.db, input), "stale_or_admin");
    await rejected(() => handlePortalBridge(mockDatabase().db, { ...input, id: type === "PortalOrder" ? "order_admin" : "invoice_admin" }), "stale_or_admin");
    await rejected(() => handlePortalBridge(mockDatabase().db, { ...input, status: "FORGED_STATUS" }));
  }
});
console.log(`OK: ${checks} signed bridge and data-preservation checks. Synthetic records only; no database or network.`);
