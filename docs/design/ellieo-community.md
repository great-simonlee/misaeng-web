# Ellieo — Community design (v3, 2026-11-16)

User decision: throw away the previous Ellieo look and rebuild everything as a **community platform, Reddit-style
"communities"**. Functions stay exactly the same (no new features, no removed features). This file overrides
`ellieo-social.md` for layout; brand basics below are kept.

## Brand basics (kept)
- Logo: house mark + ELLIEO (unchanged artwork). Main color: Ellieo blue `#1F5EFF`. Font: **Inter**.
- Neutrals: page `#FFFFFF`, surface `#F6F7F9`, hairline `#E6E8EC`, ink `#0F1419`, muted `#5B6470`, subtle `#8A929C`.
- No lime anywhere except the loader's third dot. No emoji in UI. Line icons only.
- Type: post title 16/600, body 15/400 (line-height 1.45), meta 12/500 muted, section title 13/600 uppercase-free.
  One size per role — never auto-shrink text.

## Communities ("e/…")
Every board is a community with a round icon avatar (32px colored circle + white line icon) and the prefix `e/`.
| Group | Community | Existing board / screen | Icon | Color |
|---|---|---|---|---|
| Housing | e/Rent | housing listings (Rent) | house | #1F5EFF |
| Housing | e/Roommates | roommates · sublets | person.2 | #3B82F6 |
| Jobs & Visa | e/Visa | visa/status board | airplane | #0EA5E9 |
| Jobs & Visa | e/Interviews | job reviews | text.bubble | #6366F1 |
| Jobs & Visa | e/Companies | company directory | building.2 | #475569 |
| Jobs & Visa | e/Jobs | job postings | briefcase | #0F766E |
| Life | e/Food | food board | fork.knife | #F97316 |
| Life | e/Market | marketplace | bag | #DB2777 |
| Life | e/Ask | anonymous / Ask & Talk | bubble.left.and.bubble.right | #7C3AED |
vi names: e/Thuê nhà, e/Ở ghép, e/Visa, e/Phỏng vấn, e/Công ty, e/Tuyển dụng, e/Ăn uống, e/Chợ, e/Hỏi đáp.
Group names vi: Nhà ở, Việc làm & Visa, Đời sống.

## App structure (iOS / Android / mobile web)
Bottom bar: plain full-width white bar, hairline top border, 5 items, icon + 10–11 label, selected = blue, no
floating capsule, no collapse, no FAB:
**Home · Communities · Write · Inbox · Me** (vi: Trang chủ · Cộng đồng · Viết · Hộp thư · Tôi).
- Write = normal tab item (square.and.pencil); tapping opens the composer flow (does not switch tab).
- Inbox = the unified Notifications + Messages list (already built). Bell icon is therefore removed from headers.
- Me = My Page (profile, points, my posts, saved, settings), restyled.

### Home
Header: logo · city pill (dropdown) · search icon (if search exists; else omit) · avatar is NOT needed (Me tab).
Below header: sort row `New · Popular` (only sorts the backend/app already supports; if only "new", show no sort
row). Then the **feed**: posts from all communities, newest first.
Logged out: one slim row above the feed: "Join verified students & pros in {City}" + small blue "Sign up" button.

### Post row (feed + community lists)
Flat, full-width rows separated by a 1px hairline (no big rounded cards, no shadows).
1. Meta line: community avatar (20px) · **e/Community** (600) · author nickname · verified check + school · time.
2. Title (16/600, max 2 lines). 3. Body preview (15/400 muted ink, max 2 lines).
4. Media: listings / market / food with photos → 16:9 image (12px radius) under the text; others → none.
   Listing rows also show price line (blue, 600) and key facts (beds · baths · move-in).
5. Action bar: like (arrow.up outline → filled blue when liked) + count · comments + count · share. No downvote.

### Communities tab
Title "Communities". Grouped list (Housing / Jobs & Visa / Life): avatar 40px, e/Name 16/600, one-line description
13 muted, chevron. Tap → community page.

### Community page
Compact banner: 56px band in the community color (10% tint), avatar 56px overlapping bottom-left, e/Name 20/700,
one-line description, then the community's existing filters as a single row of small outline chips, then posts in
the post-row style. Special communities keep their content type in the new style:
- e/Rent: listing rows (image, address, price, facts) — housing detail as today, restyled.
- e/Market: 2-column photo grid allowed (image, price, title).
- e/Companies: list rows (logo initial, name, open postings count).
- e/Jobs: posting rows (company, title, level, location).
Write button inside a community = small blue pill "Post" in the banner (pre-selects that community).

### Post detail
Back · e/Community header row. Meta line, title 20/700, body, images, action bar, then comments: threaded with 2px
left guide lines for replies, author/verified on each, reply/like actions small. Composer pinned at bottom.

### Write
Step 1 sheet "Post to…": the 9 communities as rows (avatar + name + description); only those the user may post to.
Step 2: the existing form for that board, restyled (same fields/validation).

## Web desktop (≥1024px)
Reddit-like 3 columns: left sidebar (240px) = Home + community list grouped; center feed (max 640px); right
sidebar (300px) = city card, New listings (3), safety commitments. Top header: logo · city pill · search · inbox ·
avatar/Log in. No bottom bar on desktop.

## Must not change
All behavior, routes/deep links, data rules (translation-only, staging/prod), legal, auth, points, push.
