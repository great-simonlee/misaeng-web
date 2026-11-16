# Ellieo design system: "Social feed" (B안, 2026-11-16)

One look for ellieo.com and the Ellieo app. Features are the same as Misaeng; **nothing may look like Misaeng**
(Misaeng = gray canvas, coral, flat boxed cards, blurred header with board tabs, Pretendard).
The previous navy theme layout is retired; Ellieo keeps its own logo and blue (#1F5EFF).

## Feel

Bright, young, people-first. A vertical feed of big rounded cards, like a social app. Every post starts with the
person (photo, nickname, verified school/work mark), then the content, then reactions. Boards are emoji chips.
Navigation lives in a bottom tab bar on every screen size (web too).

## Logo (user 11-16: keep Ellieo's existing logo)

- Web: `public/brand/ellieo-banner.png` (house mark + ELLIEO wordmark), favicon `public/brand/ellieo-favicon.ico`,
  square `public/img/ellieo_logo.png`. App icon: `public/img/ellieo_app_icon.png` (white house mark on blue
  gradient). Do not draw a new logo.
- Square brand spots (login card icon, "official website" rows, join cards, team avatars, empty states): the
  **app icon image** as a rounded tile (~22% radius), never the blue outline house on white. The horizontal
  house+ELLIEO banner is only for top bar / footer wordmark spots.

## Tokens

| Token | Value | Use |
|---|---|---|
| bg | `#FFFFFF` | page |
| surface | `#F5F4FA` | chips, inputs, empty states, grouped sections |
| line | `#ECEAF3` | card borders, dividers |
| ink | `#14121F` | text, selected chip, primary dark buttons |
| ink-2 | `#4A4660` | secondary text |
| muted | `#8A86A0` | meta (time, counts) |
| brand (Ellieo blue) | `#1F5EFF` | **main color** (user 11-16): links, active tab, primary buttons/CTAs, the (+) post button, prices, verified/trust badges |
| brand-hover | `#1748C7` | |
| brand-soft | `#EEF3FF` | tinted backgrounds, badges (verified/trust = brand-soft bg + blue text/icon) |
| lime (tiny accent only) | `#C6F432` | ONLY the 3rd loader dot and small new/unread/current-step dots (≤5% of a screen). Never a fill on buttons, pills, badges, FABs, chips, banners, heroes or sheets |
| lime-soft | `#F3FCD6` | not used (kept as a token) |
| danger | `#F0445A` | likes (filled heart), errors |
| success | `#16B47E` | "No broker fee", verified ok |

- Font: **Be Vietnam Pro** (OFL; Vietnamese diacritics). Weights 400/500/600/700/800. Titles 700–800, tight
  tracking (-0.02em). Body 15–16px, line-height 1.55 (Vietnamese tone marks need room).
- Radius: cards **24px**, photos inside cards 18px, chips/buttons full pill, inputs 16px, sheets 28px top.
- Shadow: cards `0 1px 2px rgba(20,18,31,.04), 0 8px 24px -16px rgba(20,18,31,.18)` + 1px `line` border.
  No hard shadows, no gradients except the blue (#3D7BFF→#143FB0) ring on partner story avatars.
- Spacing: 16px page gutter on phones; feed cards 12px apart; card padding 16px (phones) / 20px (≥640px).

### Color rules (blue main, lime = tiny accent only; revised 11-16)

- User 11-16: "main color is Ellieo blue, lime is only an accent". Every screen must read as BLUE + white, not lime.
- Contrast: white on blue ≈ 5.1:1 (AA) · ink on lime ≈ 14.5:1 · blue vs lime ≈ 4:1 (large shapes only) ·
  lime on white ≈ 1.3:1 → **never lime text on white**, never blue text on lime or lime text on blue.
- Proportions: white 60–70% · ink/grays 20–30% · blue 10–15% · lime ≤5% (loader 3rd dot, tiny new/unread dots only).
- Keep white or ink between large blue and lime areas (both are highly saturated and vibrate when they touch).
- Roles: blue = main/action color — (+) post button (solid blue, white plus), primary buttons/CTAs, active tab, links,
  prices, verified/trust badges (brand-soft bg + blue text, or blue bg + white text). On a blue card the CTA is a white
  pill with blue text. Price tags on photos = white pill, ink bold text. Lime = loader 3rd dot + tiny dots, nothing else.

## Layout

- **Top bar** (56px, white, hairline bottom): left = Ellieo logo (house mark + ELLIEO wordmark, `ellieo-banner.png`) +
  city pill (`NYC ▾`, surface bg). Right = language (EN/VI, ≥640px), bell (inbox),
  avatar (or `Log in` pill, brand blue bg, white text).
- **Board chips row** under the top bar on home and board lists, horizontally scrollable, emoji + label:
  🏠 Housing · 🛂 Visa · 💼 Jobs · 🤝 Roommates · 🍜 Food · 💬 Ask & Talk · 🛍️ Marketplace · 🎉 Events.
  Selected = ink pill with white text; others = surface pill.
- **Bottom tab bar** on every width (user 11-16): **Home · Housing · (+) · Visa · Jobs**. No Inbox / Me / Explore
  tabs — inbox (bell) and profile (avatar) live in the top bar; other boards (Roommates, Food, Ask & Talk,
  Marketplace, Events) are reached from the emoji chips. Jobs = interview reviews + companies + postings. The (+) is
  a 52px solid brand-blue circle with a white plus, raised; it opens a "What do you want to post?" sheet listing the boards with
  emoji. Active tab = brand blue icon + label; others muted. On ≥1024px the bar is a floating white pill (max 440px
  wide) centered at the bottom.
- **Desktop**: one centered feed column, **max 640px**. Optional right rail (≥1280px, 320px) for "Join" card,
  trending posts. No left sidebar, no wide grids except housing photos (2 columns inside the 640 column is OK at
  ≥640px... keep 1 column on phones).
- Footer: small, muted, inside the column, above the tab bar padding.

## App launch (user 11-16: "clean like Misaeng's first screen"; photo and logo-draw versions rejected)

- Same structure as Misaeng's SplashView (misaeng-app ios/Misaeng/App/RootView.swift): plain white, one vertical
  lockup optically centred (~28pt above the middle): Ellieo house mark above the ELLIEO wordmark
  (`ellieo-logo-vertical.png`), **~112pt wide** (smaller than the first Ellieo try); city name below as a quiet
  caption (12pt light, muted, letter-spaced, 16pt gap); the three-dot loader (blue, blue, lime) 40pt below.
- Appears with a soft 0.4s ease-out (scale 0.97→1). Shown ~1.5–2s while Home prefetches, then fades (0.35s).
- System launch screen: plain white. No photo, no gradient, no drawing animation, no app-icon tile.

## Components

- **Post card**: header row = avatar 40px (anonymous → brand blue-soft circle with 💬) + nickname (600) + verified
  check (brand blue) + school/work label + `· 2h`; board tag at the right as an emoji chip. Title 17px/700, 2-line
  body excerpt, optional photo (18px radius, full card width, 4:3). Footer = ♥ count, 💬 count, views; icons
  outline, filled red heart when liked.
- **Housing card**: photo first (4:3, 18px radius, inside card padding), white price tag over the photo bottom-left
  (`$1,450/mo`, ink bold text, soft shadow), then title, area · beds/baths, perk chips (`No broker fee` success-soft).
- **Job review / company / posting cards**: same card shell; company logo 40px rounded-12 in the header instead
  of a person avatar.
- **Detail pages**: same card shell, full content; comments as a feed of small cards with avatars; sticky bottom
  action bar (white, top hairline) above the tab bar.
- **Buttons**: primary = brand blue pill, white text, 48px; secondary = surface pill, ink text; destructive = danger.
- **Chips**: pill 36px, surface bg, 14px/600; selected ink bg.
- **Inputs**: surface bg, no border until focus; focus = 2px brand blue ring.
- **Empty states / sheet heroes / composer headers** (user 11-16): NO big emoji or 3D-looking illustrations.
  Use a clean line icon (SF Symbols / Material Symbols Rounded / Lucide, outline, ~28px) in brand blue on a
  64px brand-soft circle, then one line + action button. No emoji anywhere in the UI: board chips and board tags use small line icons too (user 11-16).
- **Loading** (user choice 11-16): **three bouncing dots** — brand blue, brand blue, lime; ~8px dots, 6px gap, each hops
  ~6px in turn (stagger ~0.15s, ~0.9s loop). No logo above it, no ring. Same component for full-screen,
  section, button busy and pull-to-refresh. Never gray skeleton blocks; one full-screen loader if two would show.
- **Badges**: `New`/`Trending`/`Coming soon` = brand-soft pill, brand-deep text; `Verified` = brand-soft pill brand blue
  text (or blue pill white text). Sample-data tags = surface pill, muted text. No lime pills.
- **Sheets/modals**: bottom sheet on phones (28px top radius, grab handle), centered card on desktop.

## Copy

English default, Vietnamese switchable. Friendly, short, second person. No Korean text, no "Misaeng" on screen.
