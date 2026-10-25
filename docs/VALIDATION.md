# Validation record

Environment: Node.js 24.22.1, local SQLite through `node:sqlite`; 24 October 2026. Package versions are pinned by `package-lock.json`. Tests create separate temporary databases and do not use the shipped demo database.

## Final command results

| Command             | Result                                                          |
| ------------------- | --------------------------------------------------------------- |
| `npm test`          | **Passed: 62 tests in 5 files**, 3.95 seconds; 20:50 UTC        |
| `npm run typecheck` | Passed, exit 0                                                  |
| `npm run lint`      | Passed, exit 0; no lint errors or warnings                      |
| `npm run build`     | Passed, exit 0; all 17 page routes and the API handler compiled |
| `npm run test:e2e`  | Not executed; browser authorization limitation described below  |

The build finished successfully, including its TypeScript phase. An npm proxy-environment warning comes from this workspace configuration and is not an application lint error. No failed test remains in the executed suite.

## Coverage and evidence

| Layer             | What is exercised                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business rules    | Required bundle examples, highest qualifying tier, cap, duplicate IDs, integer satang, host/commission reconciliation, filters, trip edits, scheduling constraints, validation                                                                                      |
| Database services | Migration/seed, actual SQLite persistence, auth hashes and revoked sessions, revision conflicts, server repricing, idempotency, changed-quantity duplicate protection, concurrent capacity, rollback, cancellation/repricing, community ownership and host approval |
| API               | Direct NextRequest/Route Handler calls for origin rejection, content type, server cookies, role escalation prevention, public/private data, authoritative quotes, no-store and session expiry                                                                       |
| React components  | jsdom interaction tests for search navigation arguments, filters, language/theme persistence, add/remove trip items and repricing, planner, registration and booking form payloads                                                                                  |
| Static assets     | All eight CSS font URLs resolve to included files; shipped WebP files have the expected container signature                                                                                                                                                         |

The concurrency tests cover capacity competition and isolation of standalone writes from another request's rollback within the local SQLite process; they are not distributed or PostgreSQL load tests. API tests call the handler directly rather than using a deployed HTTP server. UI tests use controlled fetch/router substitutes and do not validate network-to-browser integration.

## Visual and browser validation

All eight reference screenshots and HTML files were reviewed, and the design system was read. A real desktop homepage preview was opened and inspected after fixing SQLite's non-plain row objects for React serialization. Fonts with duplicated URL prefixes were subsequently fixed and are checked by the asset test.

Further browser automation was blocked by the environment's browser URL authorization policy. The full traveler flow, live authentication navigation and responsive screenshots were therefore **not verified end-to-end**. No final all-page visual parity claim is made. The included `tests/e2e/traveler.spec.ts` and `playwright.config.ts` prepare Chromium checks at 390/768/1440 px. Run them on the owner's machine:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser suite uses a fresh temporary SQLite database and local port 3100. A real-device and accessibility review remains necessary.

## Unverified integrations

PostgreSQL/Supabase, external authentication, email delivery, image uploads, AI providers, payment gateways, payouts, refunds and hosting were not connected or tested. Contract interfaces and configuration instructions do not constitute a working integration. All bookings keep payment status `not_collected`.

See `IMPLEMENTATION_STATUS.md`, `DESIGN_AUDIT.md`, and `docs/DEPLOYMENT.md` for implementation scope and remaining owner configuration.
