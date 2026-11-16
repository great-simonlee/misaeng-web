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

## Tokens

| Token | Value | Use |
|---|---|---|
| bg | `#FFFFFF` | page |
| surface | `#F5F4FA` | chips, inputs, empty states, grouped sections |
| line | `#ECEAF3` | card borders, dividers |
| ink | `#14121F` | text, selected chip, primary dark buttons |
| ink-2 | `#4A4660` | secondary text |
| muted | `#8A86A0` | meta (time, counts) |
| brand (Ellieo blue) | `#1F5EFF` | brand: links, active tab, primary buttons, verified mark (user 11-16: keep Ellieo's own color) |
| brand-hover | `#1748C7` | |
| brand-soft | `#EEF3FF` | tinted backgrounds, badges |
| lime | `#C6F432` | highlight: FAB (+), "New" badges, selected-state underline, price tags; text on lime is ink |
| lime-soft | `#F3FCD6` | |
| danger | `#F0445A` | likes (filled heart), errors |
| success | `#16B47E` | "No broker fee", verified ok |

- Font: **Be Vietnam Pro** (OFL; Vietnamese diacritics). Weights 400/500/600/700/800. Titles 700–800, tight
  tracking (-0.02em). Body 15–16px, line-height 1.55 (Vietnamese tone marks need room).
- Radius: cards **24px**, photos inside cards 18px, chips/buttons full pill, inputs 16px, sheets 28px top.
- Shadow: cards `0 1px 2px rgba(20,18,31,.04), 0 8px 24px -16px rgba(20,18,31,.18)` + 1px `line` border.
  No hard shadows, no gradients except the lime→brand blue ring on story avatars.
- Spacing: 16px page gutter on phones; feed cards 12px apart; card padding 16px (phones) / 20px (≥640px).

## Layout

- **Top bar** (56px, white, hairline bottom): left = Ellieo logo (house mark + ELLIEO wordmark, `ellieo-banner.png`) +
  city pill (`NYC ▾`, surface bg). Right = language (EN/VI, ≥640px), bell (inbox),
  avatar (or `Log in` pill, ink bg, white text).
- **Board chips row** under the top bar on home and board lists, horizontally scrollable, emoji + label:
  🏠 Housing · 🛂 Visa · 💼 Jobs · 🤝 Roommates · 🍜 Food · 💬 Ask & Talk · 🛍️ Marketplace · 🎉 Events.
  Selected = ink pill with white text; others = surface pill.
- **Bottom tab bar** on every width: Home · Explore · (+) · Inbox · Me. The (+) is a 52px lime circle with an ink
  plus, raised; it opens a "What do you want to post?" sheet listing the boards with emoji. Active tab = brand blue
  icon + label; others muted. On ≥1024px the bar is a floating white pill (max 440px wide) centered at the bottom.
- **Desktop**: one centered feed column, **max 640px**. Optional right rail (≥1280px, 320px) for "Join" card,
  trending posts. No left sidebar, no wide grids except housing photos (2 columns inside the 640 column is OK at
  ≥640px... keep 1 column on phones).
- Footer: small, muted, inside the column, above the tab bar padding.

## Components

- **Post card**: header row = avatar 40px (anonymous → brand blue-soft circle with 💬) + nickname (600) + verified
  check (brand blue) + school/work label + `· 2h`; board tag at the right as an emoji chip. Title 17px/700, 2-line
  body excerpt, optional photo (18px radius, full card width, 4:3). Footer = ♥ count, 💬 count, views; icons
  outline, filled red heart when liked.
- **Housing card**: photo first (4:3, 18px radius, inside card padding), lime price tag over the photo bottom-left
  (`$1,450/mo`, ink text), then title, area · beds/baths, perk chips (`No broker fee` success-soft).
- **Job review / company / posting cards**: same card shell; company logo 40px rounded-12 in the header instead
  of a person avatar.
- **Detail pages**: same card shell, full content; comments as a feed of small cards with avatars; sticky bottom
  action bar (white, top hairline) above the tab bar.
- **Buttons**: primary = brand blue pill, white text, 48px; secondary = surface pill, ink text; destructive = danger.
- **Chips**: pill 36px, surface bg, 14px/600; selected ink bg.
- **Inputs**: surface bg, no border until focus; focus = 2px brand blue ring.
- **Empty states**: big emoji (48px) + one line + action button, centered, in a surface card.
- **Loading** (user choice 11-16): **three bouncing dots** — brand blue, brand blue, lime; ~8px dots, 6px gap, each hops
  ~6px in turn (stagger ~0.15s, ~0.9s loop). No logo above it, no ring. Same component for full-screen,
  section, button busy and pull-to-refresh. Never gray skeleton blocks; one full-screen loader if two would show.
- **Badges**: `New` = lime pill ink text; `Verified` = brand blue-soft pill brand blue text.
- **Sheets/modals**: bottom sheet on phones (28px top radius, grab handle), centered card on desktop.

## Copy

English default, Vietnamese switchable. Friendly, short, second person. No Korean text, no "Misaeng" on screen.
