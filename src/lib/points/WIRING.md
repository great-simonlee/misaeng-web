# Misaeng Points — wiring checklist

**Status (2026-10-26): sections 1, 2 (web side), 3 and 5 are wired; the ERP calls `/api/internal/points/verification`
after workplace / Instagram approvals. Section 4 (body gating) waits for the paywall.**
Decisions: `earn.verify_second_email` stays off; free-period unlocks stay open for good after the paywall starts
(`unlock_post` treats an existing `content_unlocks` row of any method as unlocked); the legacy backfill runs once for
everyone before cutover (runbook step 3).

Originally nothing below was wired. Every call goes through `@lib/points/facade.server` (never call
`@lib/community/creditLedger` directly any more). The facade routes to the legacy credit JSON before
`points.cutover_at` (or when `supabase/points.sql` hasn't been run) and to the new ledger after it.
Facade hooks never throw; keep the existing `try/catch` around them anyway.

## 1. Replace legacy credit calls (same place, same moment)

| File (function) | Today | Replace with |
|---|---|---|
| `src/app/api/community/route.ts` (POST, after `saveStoredCommunityPost`) | `awardPostCredit({ uid, postId, boardId, timelineCount })` | `onPostCreated({ uid: user.uid, post: saved })` |
| `src/app/api/community/[id]/route.ts` (PATCH, after save) | `awardPostCredit(...)` | `onPostUpdated({ uid: user.uid, post: saved })` |
| `src/app/api/community/[id]/route.ts` (DELETE, after delete) | `revokeSourceCredit({ reasons: food/status/job-review/review-bonus })` | `onPostDeleted({ uid: user.uid, postId: id })` |
| `src/app/api/community/guest/route.ts` (POST, `isMember` branch) | `awardPostCredit(...)` + balance diff | `onPostCreated({ uid: user.uid, post: saved })`. After cutover nothing is paid immediately (a pending claim is created) → the `awarded` field must become 0 / "pending review" |
| `src/lib/community/guestLink.server.ts` (link loop, ~line 111) | `awardPostCredit(...)` + `readBalance` diff | `onGuestPostLinked({ uid: actor.uid, post: saved, linkedAt: Date.now() })`; same note about `creditAwarded` |
| `src/app/api/community/[id]/comments/route.ts` (POST, after save) | `awardCommentCredit({...})` | `onCommentCreated({ uid, commentId: comment.id, postId, boardId: categoryId, postAuthorUid: post?.authorUid ?? null, parentAuthorUid: parent?.authorUid ?? null, body: comment.body })` (body is new: min-chars rule) |
| `src/app/api/community/[id]/comments/route.ts` (DELETE) | `revokeSourceCredit({ reasons: ['comment'] })` for the comment and each deleted reply | `onCommentDeleted({ uid: item.authorUid, commentId: item.id })` for the comment and **each** reply deleted with it (each with its own author) |
| `src/app/api/agent-auth/school-email/route.ts` (confirm, after `markSchoolVerified`) | `awardSchoolVerifyCredit(user.uid)` | `onVerificationCompleted(user.uid, 'school_email', email)` |
| `src/lib/community/referral.server.ts` (`bindUserReferrer`, end) | `awardReferralBindCredit({ referrerUid, referredUid })` | `onReferralBound({ referrerUid: indexed.uid, referredUid: userId })` |
| `src/app/api/community/credit-reviews/route.ts` (approve) | `awardReviewBonusCredit({ uid, postId })` | `awardForReviewBonus({ uid, postId })` (no-op after cutover; claims replace it) |

## 2. New calls

| Where | Call |
|---|---|
| `src/app/api/agent-auth/profile/route.ts` PATCH, after `upsertSupabaseProfile` | if the profile went from incomplete to complete (`isProfileCompleteForPoints(before) === false && isProfileCompleteForPoints(after)`, from `@lib/points/account.server`): `onProfileCompleted(user.uid)` |
| ellieo-erp, after approving a **workplace** verification (profile `workplaceStatus='approved'` saved) | `POST {web}/api/internal/points/verification` `{ uid, kind: 'work_email', identifier: workEmail }` |
| ellieo-erp, after approving an **Instagram** verification (profile `instagramVerified`, `instagramReviewedAt` saved) | `POST {web}/api/internal/points/verification` `{ uid, kind: 'instagram', identifier: handle }` (next to the existing `/api/internal/push` call in `misaengPush.js`) |
| Verification-documents feature (other agent), when a review document is approved | `onReviewDocumentVerified({ postId, actor })` → adds / pays the `verified` component |
| Instagram-code route (`src/app/api/agent-auth/instagram/route.ts`) | nothing: Instagram points are paid on ERP approval only |

## 3. Reads that must switch at cutover

* `src/app/api/community/credit/route.ts` (GET summary / `?ledger=1`) calls `ensureCreditBackfill`, which **writes** the
  legacy JSON. Before cutover it can stay. At cutover switch it to `getPointsSummary(uid)` /
  `getPointsHistoryFor(uid, cursor)` (or point the UI to `/api/points/balance` and `/api/points/history`),
  otherwise legacy entries keep being created after the carry-over snapshot.
* Any screen showing "credit" balance (`/me`, app `/api/app/me` if it shows credits) → `/api/points/balance`.

## 4. Review body gating (only matters once `paywall.enabled = true`)

`src/lib/community/reviewAccess.ts` `canViewReviewBody` returns `true` for everyone today. When the paywall is
turned on, it must become: author, OR `hasUnlocked(viewer.uid, post.id)` (`@lib/points/unlock.server`), for
`isLockableBoard(categoryId)` posts (job-review + status/cpt-opt/visa/green-card; food never). That function is
sync today, so the list/detail APIs need to pre-load the viewer's unlocks (one `content_unlocks` query per
request). The client opens a post with `POST /api/community/[id]/unlock`.

## 5. Housing boost ordering (roommate board)

Boosts live in `point_post_boosts`, not in the post JSON. Price/limits (2026-10-26): `spend.housing_post_boost` 50 for
`rule.housing_boost_days` 7, `rule.housing_boost_cooldown_days` 7 after a pin ends, `cap.housing_boost_monthly` 2 per user,
`cap.housing_boost_active` 3 per board + city — checked in the `boost_post` RPC; `GET /api/community/{id}/boost` returns the
button state. To pin boosted posts:
`src/app/api/community/route.ts` GET (list branch, after `listStoredCommunityPosts(board, city)`): when
`board === 'roommate'`, `const boosts = await getActiveBoosts(stored.map((p) => p.id))` (`@lib/points/boost.server`,
returns an empty map if the tables are missing) and stable-sort posts with an active boost first (by
`boostedUntil` desc), then the existing order; also attach `boostedUntil` to each post in the response for a
badge. Same for any app list endpoint that returns the roommate board. Agent listings (`/api/housing`) are
never boosted.

## 6. Cutover runbook

1. Run `supabase/points.sql` on staging, test, then production (re-run it if it was run before 2026-10-26: the
   `unlock_post` function changed — free-period unlocks stay unlocked).
2. Wire sections 1–3 (done; safe before cutover: the facade still calls legacy).
3. **Legacy backfill, once, for everyone** (before cutover). The legacy system credits old posts and the
   school-verify bonus only when a user opens the credit page (`ensureCreditBackfill`); without this step users who
   never did would carry over too little. ERP → Misaeng → Points → Settings → "Legacy backfill": *Dry run*
   (preview: users / points to add) then *Run*. Server: `POST /api/internal/points/legacy-backfill`
   `{ cursor, limit, dryRun }` (header `x-internal-secret`), repeat with `nextCursor` until `done`. Idempotent
   (a second run adds nothing). A real run is refused once the ledger is active. Run it again right before step 4
   to catch posts written in between (cheap: only missing entries are added).
4. Set `points.cutover_at` via ERP → Points → Settings (or `POST /api/internal/points/settings`
   `{ settings: { 'points.cutover_at': ISO } }`). All servers switch within 30 s (config cache). Each user's legacy
   balance is carried over on first access (`legacy:opening:{uid}` adjust row).
5. After cutover: the ERP skips its direct legacy `awardWorkplaceVerifyCredit` call (it reads
   `engine` from `GET /api/internal/points/rules`), `/api/community/credit` serves the ledger, the roommate list
   pins boosted posts, `/api/community/credit-reviews` approve answers 409 (claims replace it).

## 7. ERP ↔ web internal endpoints (header `x-internal-secret`, `x-admin-id` = admin email)

| Endpoint | Use |
|---|---|
| `GET/POST /api/internal/points/rules`, `GET .../rules/history` | rule editor + change history (`engine` in GET) |
| `POST /api/internal/points/settings` | cutover, paywall |
| `POST /api/internal/points/legacy-backfill` | one-time legacy backfill (dry run / run) |
| `GET /api/internal/points/claims?status=` , `POST .../claims/[id]/decision` | claims queue |
| `GET /api/internal/points/coffee-chats?status=` , `POST .../coffee-chats/[id]` | coffee chat queue |
| `POST /api/internal/points/clawback` | manual clawback |
| `POST /api/internal/points/verification` | workplace / Instagram approved in ERP |
