# Configuration and deployment preparation

No Site, public deployment, purchase or payment activation was performed.

## Local build

Use Node.js 24+ and the committed lockfile:

```bash
npm ci
npm run db:migrate
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`npm start` uses port 3000 by default. Keep the project root as the working directory because migration and local database paths are relative to it. SQLite is appropriate for this local MVP and a single server with persistent disk; do not place it on ephemeral serverless storage or share a database file across unrelated deployments.

## PostgreSQL configuration

Set `DATABASE_URL` to a dedicated server-only PostgreSQL database and use the provider's required TLS settings. `DATABASE_SSL=true` enables certificate verification. The browser does not use a public/anon database key. Run `npm run db:migrate` before routing traffic to the process. PostgreSQL transactions and schema are implemented but were not tested against a live service here.

A Supabase PostgreSQL connection may be used as the database only. It does not automatically connect Supabase Auth, Storage, or REST/RLS policies. Review `migrations/postgres/README.md` and its optional lockdown script first.

## Production guardrails

Create a separate empty database, then configure:

```dotenv
APP_MODE=production
APP_ORIGIN=https://your-domain.example
SESSION_SECURE=true
DATABASE_URL=postgresql://server-only-credentials@host/database
DATABASE_SSL=true
```

Do not reuse demo records. The environment marker prevents a database from silently switching between demo and production. No demo catalog is seeded in production. Bundle promotions remain disabled until their payment and funding workflow is implemented. There is no environment flag that turns this MVP into a payment processor.

Deploy behind HTTPS and a trusted reverse proxy. Set the exact `APP_ORIGIN`. Ensure the proxy overwrites client-supplied forwarded headers before using them for IP-based abuse limits. Keep database credentials outside Git and client-side code. Enable backups, restoration drills, error monitoring, process supervision and a database retention policy. Test the exact hosting topology, including cookies, TLS, migrations and concurrency.

## Owner tasks before launch

1. Choose and configure actual hosting/database services and test PostgreSQL in that environment.
2. Add a reviewed authentication provider or finish email verification, password reset, account recovery and session/device management.
3. Add organizer image upload storage, content/magic-byte validation, size/dimension limits and ownership controls.
4. Add pending-request expiration, operational alerts and cancellation/dispute procedures.
5. Integrate a marketplace-capable payment provider only after host onboarding, legal terms, webhook/payout/refund testing and financial review.
6. Confirm commission/discount commercial terms with hosts. Payment processing fees and operating expenses are not estimated as zero.
7. Replace demo listings/photos with permission-cleared organizer records. Set age/guardian requirements and review organizer safety information.
8. Finalize privacy notices, controller/contact details, consent evidence, retention and access/deletion processes; obtain appropriate PDPA/legal review.
9. Run the supplied browser suite on 390/768/1440 px, both languages/themes, and real devices before public release.
10. Conduct an independent security and accessibility review. Passing the included tests is not a production certification.

Official implementation references consulted: [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), and [Node SQLite](https://nodejs.org/api/sqlite.html).
