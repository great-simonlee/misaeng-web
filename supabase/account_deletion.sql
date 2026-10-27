-- Account deletion support (DELETE /api/app/me, src/lib/account/deleteAccount.server.ts).
-- Written by misaeng-web with the service role key only. Run in the Supabase SQL Editor. Safe to re-run.
-- Optional: without it, Sign in with Apple tokens are simply not revoked on deletion.

-- Sign in with Apple refresh tokens (account deletion → https://appleid.apple.com/auth/revoke).
-- Filled only when APPLE_TEAM_ID / APPLE_SIWA_KEY_ID / APPLE_SIWA_PRIVATE_KEY are set (src/lib/account/appleRevoke.server.ts).
create table if not exists public.apple_siwa_tokens (
  user_id text primary key,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apple_siwa_tokens enable row level security;
revoke all on public.apple_siwa_tokens from anon, authenticated;
grant select, insert, update, delete on public.apple_siwa_tokens to service_role;

notify pgrst, 'reload schema';
