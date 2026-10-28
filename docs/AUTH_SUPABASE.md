# Misaeng's own login (Supabase Auth) — setup and switch-over

Misaeng web + app sign-in moves off Ellieo onto Supabase Auth (same Supabase project, `nibpfpeovmfpufyzpatk`).
Existing members keep their uid (their Ellieo-era id, which is their email), so posts, points, saves and
profiles don't move. Code: `src/lib/auth/*`, routes `/api/app-auth/*` (app) and `/api/agent-auth/*` (web).

Nothing changes until `MISAENG_AUTH_PROVIDER=supabase` is set; until then Ellieo is used exactly as before.

## 1. Supabase dashboard (Authentication)

**Sign In / Providers**
- Email: enabled, **Confirm email ON**, Secure email change ON, minimum password length 6.
- Google: enabled. *Client IDs* (comma separated): the web client
  `70178840937-6rda4ku9ii47nu5s3a6g2hhkotco4op9.apps.googleusercontent.com` and the iOS client
  `70178840937-g02kdich73uct99gvtp2vussjh8hs2oc.apps.googleusercontent.com`. Client secret: the web client's
  secret (GCP → Credentials). Turn on **Skip nonce checks** (the iOS GoogleSignIn token carries a nonce we don't set).
- Apple: enabled. *Client IDs*: `com.misaeng.nyc,com.misaeng.nyc.web`. Secret key (for web OAuth): generate
  from Team ID `K75A78VM5H`, Key ID and the `.p8` (Supabase shows a generator), Services ID `com.misaeng.nyc.web`.

**URL Configuration**: Site URL `https://misaeng.com`.

**SMTP** (Emails → SMTP Settings → custom SMTP): host `smtp.resend.com`, port `465`, user `resend`,
password = the Resend API key, sender `no-reply@misaeng.com`, sender name `미생`.

**Email templates** — the app and web ask for the 6-digit code, so the templates must show `{{ .Token }}`:
- Confirm signup — subject `[미생] 이메일 인증번호`, body: "미생 가입을 위한 인증번호예요: **{{ .Token }}** (10분 동안 유효)".
- Reset password — subject `[미생] 비밀번호 재설정 인증번호`, body: "비밀번호를 바꾸려면 이 인증번호를 입력해 주세요: **{{ .Token }}**".
- Email OTP expiry: 600 seconds (Providers → Email).

**Rate limits**: emails per hour ≥ 30 once custom SMTP is on.

## 2. Apple Developer

1. Identifiers → `com.misaeng.nyc` → Sign In with Apple → Edit → **Enable as a primary App ID** (out of the Ellieo group).
2. Keys → a Sign in with Apple key for `com.misaeng.nyc` (e.g. `2TPXYG58KR`).
3. Services ID `com.misaeng.nyc.web`: domains `misaeng.com, www.misaeng.com, nibpfpeovmfpufyzpatk.supabase.co`,
   return URL `https://nibpfpeovmfpufyzpatk.supabase.co/auth/v1/callback`.
4. Sign in with Apple for Email Communication: `misaeng.com`, `no-reply@misaeng.com` (after the Resend DNS records).

## 3. Resend

Domain `misaeng.com` verified (SPF merged into the existing SPF record, DKIM, DMARC). API key → server env.

## 4. Server env (misaeng.com)

```
MISAENG_AUTH_PROVIDER=supabase        # switch on (leave unset until everything above is done)
ELLIEO_LEGACY_LOGIN=on                # switch-over window; set "off" ~3 months later
RESEND_API_KEY=re_...
EMAIL_FROM=미생 <no-reply@misaeng.com>
APPLE_TEAM_ID=K75A78VM5H
APPLE_CLIENT_ID=com.misaeng.nyc
APPLE_SIWA_KEY_ID=<Key ID>             # Apple revoke on account deletion
APPLE_SIWA_PRIVATE_KEY=<.p8 contents>
```
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` already exist.

## 5. Switch-over order

1. Run `supabase/misaeng_auth.sql` in the SQL editor.
2. `node scripts/backfill-legacy-users.mjs` (dry run) → check the report → `--apply`.
3. Dashboard (1), Apple (2), Resend (3) done; test on a preview/local with `MISAENG_AUTH_PROVIDER=supabase`.
4. Ship the app build with the code steps (email sign-up code, reset code, Apple nonce) to the App Store.
5. Deploy the web with the env above. From now on:
   - signed-in app users are moved silently at their next token refresh (Ellieo refresh token → Misaeng session),
   - signed-in web users are moved on their next request (Ellieo cookie → misaeng_* cookies),
   - email members: the first password sign-in is checked once with Ellieo, then the password lives in Supabase,
   - anyone else (or after `ELLIEO_LEGACY_LOGIN=off`): "forgot password" → code → new password → same uid,
   - Google / Apple members: linked by their verified email.
6. ~3 months later: `ELLIEO_LEGACY_LOGIN=off`, then remove the Ellieo code paths.

Old app builds (before step 4) can still sign in with email/Google and refresh, but **cannot sign up by email**
(they don't know the code step) — release the app first.
