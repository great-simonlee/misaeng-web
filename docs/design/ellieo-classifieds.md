# Ellieo — HeyKorean-style design (v4, 2026-11-16)

User decision (final for now): "헤이코리안 같은 느낌". A dense **life-info / classifieds portal**: photo tile grid for
anything with a photo + price (rent, roommates, market, food), board-style text lists for discussion boards.
Functions stay exactly the same. This overrides `ellieo-community.md` (Reddit v3) and `ellieo-social.md` layouts.
Do not show controls that do nothing (no like buttons where no like API exists).

## Brand basics (kept)
Logo (house mark + ELLIEO) unchanged · Ellieo blue `#1F5EFF` for accents/actions · Inter · white background ·
hairlines `#E6E8EC` · ink `#111418` · gray `#6B7280` / `#9CA3AF`. No shadows on list content, small radius (8–10).
No lime except the loader's 3rd dot. No emoji. Line icons. One fixed size per text role (never auto-shrink).
Density is HIGH (portal feel): 12–15px text, tight spacing.

## Categories (no "e/" prefix)
| key | en | vi | view | source |
|---|---|---|---|---|
| all | All | Tất cả | mixed grid + text blocks | — |
| rent | Rent | Thuê nhà | photo grid | housing listings |
| roommates | Roommates | Ở ghép | photo grid (text row if no photo) | roommates · sublets |
| market | Market | Chợ | photo grid | marketplace |
| jobs | Jobs | Tuyển dụng | list rows (logo) | job postings |
| interviews | Interviews | Phỏng vấn | board list | job reviews |
| companies | Companies | Công ty | list rows (logo) | company directory |
| visa | Visa | Visa | board list | visa/status board |
| food | Food | Ăn uống | photo grid | food board |
| ask | Ask | Hỏi đáp | board list | Ask & Talk |

## Mobile app / mobile web
**Header** (white, hairline under): logo · city pill (dropdown) · [search icon only if search exists] · bell (opens the
unified Inbox: notifications + messages; unread dot blue).
**Category strip** under the header (sticky): horizontal text tabs with a 2px blue underline on the selected one,
15px/600 selected ink, 15px/500 gray others.

**Bottom bar** (plain white, hairline top, icon + 10px label, selected blue):
Home · Rent · Write · Community · Me  (vi: Trang chủ · Thuê nhà · Viết · Cộng đồng · Tôi)
- Home = category strip starting at All. Rent = Rent + Roommates (strip: Rent · Roommates + filters).
- Community = strip: Visa · Interviews · Jobs · Companies · Ask · Food · Market.
- Write = opens "What are you posting?" sheet: categories the user may post to as a 2-column list (icon + name),
  then the existing form for that board (same fields/validation). Me = My Page.

### Photo tile (grid, 2 columns mobile, 12px gutter, 16px side margin)
- Photo 1:1, radius 10, object-fit cover. Bottom 40% dark gradient. On it: price bottom-left (white, 18/700;
  "Free" for free items) and a category line icon bottom-right (white, 22px: house for rent/roommates, store for
  market, fork.knife for food). Status badge top-left when Reserved/Sold/Rented (small dark pill).
- Under the photo: location 12/400 gray (neighborhood or "City, ST ZIP"), title 14/400 ink max 3 lines, then
  12 gray time ("2h"). Save heart only where save exists.
- Rent price = "From $1,890" for multi-room listings.

### Board row (Visa, Interviews, Ask; also roommates without photo)
Full-width row, hairline between rows, 12px vertical padding:
line 1: [category tag 11/600 blue on #EEF3FF] title 15/500 ink (1 line, ellipsis) + comment count in blue "[12]"
line 2: 12 gray: nickname · verified check + school · time · views (if exists).
Optional thumbnail 56×56 radius 8 on the right when the post has a photo.

### Home "All"
Mixed feed newest first: photo tiles in the 2-col grid; after every 6 tiles insert a full-width "Board" block:
heading row ("Visa & Q&A" / vi "Visa & Hỏi đáp", "More >") + latest 4 board rows. Logged out: one slim row on top
"Join verified students & pros in {City}" + small blue "Sign up".

### List rows (Jobs, Companies)
Logo 40px (radius 8, initial fallback) · title 15/600 · company/location/level 12 gray · right: deadline or count.

### Details
- Photo items (rent, roommates, market, food): full-width photo pager (1:1 or 4:3) with counter "1/5",
  then price 22/700, title 17/600, location + time 13 gray, key-facts table (2 columns, hairlines), description,
  author/seller row (nickname, verified, school), safety note, bottom action bar: blue primary button
  (Contact / Ask the seller — the existing action) + save/share icons only if they work.
- Board posts: category tag + title 18/700, author row, body, images, comments as a flat list
  (replies indented 16px with a hairline guide), comment box at the bottom (existing behavior).

## Web desktop (≥1024px)
Centered 1080px container. Header: logo · city pill · horizontal category nav (All, Rent, Roommates, Market, Jobs,
Interviews, Companies, Visa, Food, Ask) · search (if exists) · bell · avatar/Log in. Content: 4-column photo grid
(like heykorean.com desktop) with board blocks spanning full width; category pages use the same grid or a board
table. No bottom bar.

## Must not change
Behavior, routes/deep links, auth, legal, points, push, translation-only rule, staging-only writes.
