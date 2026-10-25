# Design audit — Nocturne Siam

Inspected all eight `code.html`, all eight `screen.png`, and the complete `nocturne_siam/DESIGN.md` from the uploaded `UxUi(3).zip` before implementing the React application. Images were inspected independently and also as a contact sheet. See `docs/REFERENCE_SCREEN_NOTES.md` for per-screen details.

## Source findings

The exports are independent Tailwind CDN pages, with `href="#"`, static totals, inert filters/forms, conflicting sample activity records and prefilled trip/cart badges. Reviews, popularity counts, confirmation claims, safety guarantees, and some financial values are illustrative. These were not imported as real operational data.

The design system has two palettes: lavender Material-like primary tokens in the YAML and indigo in its prose. The supplied screenshots take priority: lavender pill CTAs, deep navy, subtle grey borders, cyan metadata, amber accents, rounded photography cards, local Thai/Latin typography. The implementation uses those proportions and visual roles with semantic CSS variables. The light palette uses an indigo primary for readable contrast.

## Route mapping

| Source                   | Application           |
| ------------------------ | --------------------- |
| 01_homepage              | `/`                   |
| 02_explore_activities    | `/activities`         |
| 03_activity_detail       | `/activities/[id]`    |
| 04_my_trip               | `/my-trip`            |
| 05_ai_trip_planner       | `/trip-planner`       |
| 06_booking_summary       | `/booking/summary`    |
| 07_join_group_activities | `/group-activities`   |
| 08_login_register        | `/login`, `/register` |

Added matching screens: community registration, dashboard, activity/session management, booking requests, traveler history, profile, administration, and privacy disclosures.

## Shared components

Header/footer, locale/theme provider, activity cards, search form, page/section headings, pricing panel, trip settings, error/empty/loading states, form fields, booking statuses, and host navigation.

## Intentional changes

- Homepage hierarchy remains hero/search → experiences → categories → planner → bundle → communities → how it works → community CTA → footer.
- Removed unverified review stars/counts, popularity numbers, insurance claims, payment success, and universal identity-check claims. Labels explicitly identify demo data.
- Replaced incorrect or disconnected totals with one shared satang-based pricing engine and authoritative server quotes.
- Planner is labeled basic/deterministic; no external AI call is implied. Fixed recorded sessions take priority over a decorative timeline.
- Detail gallery uses available original photographs; ratings and reviews are absent until genuine records exist.
- The original screenshots are desktop-only. Mobile/tablet layouts were authored using the same components, with wrapping navigation, reflowing grids, accessible filters and stacked summaries.
- The source images are mostly approximately 512px wide. Local WebP assets preserve them but cannot add original detail.
- The working homepage was visually inspected in the preview browser after fixing SQLite row serialization. Final responsive/browser QA was limited by the browser control policy; no full pixel-parity claim is made.

No full-page screenshot is used as a website background or substituted for working components.
