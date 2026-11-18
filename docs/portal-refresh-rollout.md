# Customer portal refresh

This change keeps the existing PostgreSQL schema, customer IDs, password hashes,
sessions, addresses, orders and invoice records. It does not run a data migration
or send any customer emails during build or startup.

## Included

- Shared Let Me Bowl layout, logo, responsive navigation and German/English account screens.
- A common branded email layout and Brevo transport, preserving the configured legacy transport until Brevo is ready.
- A signed server-to-server connection for the shop Cockpit. The bridge exposes an explicit set of customer and order management operations, with record revision checks. It never returns password hashes or session/reset tokens, and cannot delete records or change administrator roles.
- Invoice downloads pass through the existing owner/administrator authorization loader.
- Password recovery uses expiring, single-use reset tokens for both entry points.
- Startup no longer runs `prisma db push`. Schema updates must be deliberate, separate deployment steps.

## Release prerequisites

1. **Preserve invoice files first.** The current service stores PDFs under `uploads/invoices` (legacy: `public/uploads/invoices`). The live Railway service has no persistent volume. Inventory and save existing PDF files before replacing its running deployment. Database preservation alone does not preserve those files.
2. Provision durable private storage and verify that every existing invoice record still opens its PDF after restoration. Do not put customer PDFs in a public repository or public product-image bucket.
3. Set the same independently generated `PORTAL_COCKPIT_BRIDGE_SECRET` on the portal and the shop backend. It must be 64–128 hexadecimal characters. Keep it in Railway variables; never in source or client bundles. The current nonce store assumes one portal replica. A shared store is required before adding replicas.
4. Configure `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL` and `MAIL_FROM_NAME` after the sender is verified in Brevo. Keep existing order notification, Bcc and application URL settings. An attempted Brevo send never falls back to another provider automatically.
5. Verify a real administrative login, invoice access and an explicitly authorized test email before announcing a live rollout.

## Checks

- `npm run build`
- `node scripts/check-cockpit-bridge.mjs`
- Customer and admin route rendering with synthetic fixtures only.
- Mocked Brevo/Mailjet transport checks; no customer deliveries.

The existing React Router type generator emits `page: ;` for the unchanged
pathless `_layout` route in generated route types. The production build succeeds;
the separate typecheck command is not reported as passing until that generator
issue is resolved.
