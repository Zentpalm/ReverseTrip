# Reference screen notes

All eight supplied screen.png files were visually inspected. These are layout references, not runtime assets.

## Shared visual system

- Very dark navy page canvas, slightly lighter charcoal-blue surfaces, soft violet accent glow near the top, off-white text, muted gray secondary text.
- Primary CTAs are pale lavender, usually pills; cyan marks prices, times, locations and secondary metadata. Warm amber accents belong to food, sustainability, and warning details.
- Header contains a restrained brand, text navigation, TH/EN segmented control, circular theme action, trip count pill, and account actions.
- Wide margins and generous separation between sections. Card surfaces use rounded 24–32 px corners; image corners follow the enclosing card.
- Photography carries the page. Avoid dashboard-style decorative gauges, invented numerical proof, and stock-tech visuals.
- Footer repeats five restrained columns and a compact copyright/baseline row.

## Screen composition

1. Homepage: centered atmospheric photo hero with a quiet dark overlay; large Thai headline; substantial rounded search panel below it. Primary discovery area uses a 3-column card grid, followed by six category tiles, a two-column planner introduction, three bundle tiers, three community photo cards, three steps, a wide community CTA, then footer.
2. Explore: breadcrumb, rounded filter/search strip, then left filter rail and 3-column photo cards. Cards have large image area, small organizer/category labels, title, duration/capacity, cyan price and lavender add action. Mobile should turn the rail into a collapsible filter panel.
3. Detail: title and metadata, 5-photo mosaic with the lead photo spanning two rows; main content on the left and a booking control card on the right. Content blocks cover host, summary metrics, highlights, schedule, included items, preparation, and cancellation. Do not reproduce invented ratings/reviews.
4. My Trip: broad trip-title card with destination/dates/travelers, then left day-based activity list and right price summary. Horizontal activity cards use photo on left, metadata on right. Remove/up/down controls can replace inaccessible drag-only ordering. Sidebar CTA order is planner then booking.
5. Planner: title and cost card, day tabs, vertical itinerary timeline with travel/rest segments between activities, narrower right-hand advice and price panel. Reference AI scores and live route claims must be replaced by truthful deterministic-planner labels and adjustable estimates.
6. Booking: three-step progress strip, left trip header and selected-activity rows followed by contact form; right price and financial breakdown then booking-request CTA. Reference payment and guarantee text requires correction per the supplied master prompt.
7. Groups: editorial heading and short explanation, slim filter strip, 3-column image-first session cards, then a safety section and four participation steps. Capacity should reflect real recorded bookings, not invented social proof. No public participant identities.
8. Login/Register: two-column large rounded panel. Left is a dark photographic brand story with stacked benefit cards. Right contains register/login segmented tabs, role cards for signup, vertically stacked fields and wide gradient CTA. Hide photo panel or simplify it on small screens. Do not recreate unconfigured Google/LINE actions as working controls.

## Asset mapping

The most useful source images are `/images/hero.webp`, `cooking.webp`, `pottery.webp`, `indigo.webp`, `cacao.webp`, `paddleboard.webp`, `amphawa.webp`, `coffee.webp`, `tea.webp`, `umbrella.webp`, `spa.webp`, `rafting.webp`, `market.webp`, `silver.webp`, `cooking-detail.webp`, four `detail-*.webp` images, three `community-*.webp` images, and `login-scene.webp`. Complete source attribution is in ASSETS.md and public/images/manifest.json.
