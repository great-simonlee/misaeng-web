-- Support tick every minute: housing escalations (1h → next staff in the conversation brand's rotation, 2h → that
-- brand's escalation.final) and the delayed email for unread staff replies (Misaeng + Ellieo; misaeng.com sends both).
-- Endpoint: POST https://misaeng.com/api/internal/support/tick with x-internal-secret = INTERNAL_PUSH_SECRET
-- (src/app/api/internal/support/tick/route.ts → runSupportTick). Same plan as the comment at the end of support.sql.
--
-- Needs the pg_cron and pg_net extensions (Database → Extensions) and Vault. Run once per project in the SQL editor
-- AFTER replacing the two placeholders. Safe to run again (replaces the secret value and the job).
--   <SITE_URL>                → https://misaeng.com (prod) or the staging site URL
--   <INTERNAL_PUSH_SECRET>    → the same value as that site's INTERNAL_PUSH_SECRET env (never commit the real value)
-- Stop: select cron.unschedule('support-tick');

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  secret_id uuid;
begin
  select id into secret_id from vault.secrets where name = 'support_tick_secret';
  if secret_id is null then
    perform vault.create_secret('<INTERNAL_PUSH_SECRET>', 'support_tick_secret', 'x-internal-secret for /api/internal/support/tick');
  else
    perform vault.update_secret(secret_id, '<INTERNAL_PUSH_SECRET>');
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'support-tick') then
    perform cron.unschedule('support-tick');
  end if;
end;
$$;

select cron.schedule('support-tick', '* * * * *', $job$
  select net.http_post(
    url := '<SITE_URL>/api/internal/support/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'support_tick_secret')),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 55000);
$job$);
