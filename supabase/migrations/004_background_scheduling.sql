-- Migration: Background Scheduling via pg_cron + pg_net
-- Enables server-side agent orchestration without any new vendors.
-- pg_cron calls /api/orchestrate every 10 seconds, which processes agents.
--
-- IMPORTANT: Before running this migration:
-- 1. Enable pg_cron and pg_net extensions in Supabase Dashboard > Database > Extensions
-- 2. Set app.orchestrate_url and app.orchestrate_secret via Supabase SQL:
--    ALTER DATABASE postgres SET app.orchestrate_url = 'https://your-app.vercel.app/api/orchestrate';
--    ALTER DATABASE postgres SET app.orchestrate_secret = 'your-secret-here';
--
-- To disable: SELECT cron.unschedule('orchestrate-agents');
-- To re-enable: Run the SELECT cron.schedule(...) block below again.

-- Enable extensions (may need dashboard toggle first)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Orchestration job: runs every 10 seconds
-- Uses pg_net to make an HTTP POST to the Vercel serverless function
select cron.schedule(
  'orchestrate-agents',
  '10 seconds',
  $$
  select net.http_post(
    url := current_setting('app.orchestrate_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Orchestrate-Secret', current_setting('app.orchestrate_secret')
    ),
    body := '{}'::jsonb
  )
  $$
);
