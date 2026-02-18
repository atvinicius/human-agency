# Billing & Credits — Remaining Work

## Before Launch (requires Supabase / infra config, not code)

- **Email verification on signup** — enable "Confirm email" in Supabase Auth settings so the beta credit trigger only fires for verified accounts. Prevents account farming with disposable emails.
- **CAPTCHA on signup** — enable Supabase's built-in CAPTCHA (hCaptcha or Turnstile) to block bot signups.
- **Set `ALLOWED_ORIGIN` env var** — add `ALLOWED_ORIGIN=https://humanagency.io` (or comma-separated list) in Vercel environment settings. Without it, CORS defaults to `*`.

## Post-Launch Monitoring

- **Monitor `[billing]` logs in Vercel** — failed deductions are tagged `[billing] Deduction FAILED — needs reconciliation` with full context (userId, tokens, timestamp). Set up a Vercel log drain or alert for these.
- **Audit `credit_transactions` table** — periodically verify that total lifetime_spent matches the sum of negative transactions. The `balance_after` column enables full replay.

## Future Improvements

- **Dynamic pricing from DB** — the `model_pricing` table exists and is seeded but the JS code uses hardcoded constants. To update prices without a deploy: query the table at startup or on a TTL cache, falling back to hardcoded values.
- **Per-session spending caps** — add a max spend per mission (e.g., $2) so a runaway agent loop can't drain a user's entire balance in one session.
- **Daily spending alerts** — notify users when they've spent >50% of their balance in a day.
- **Globally consistent rate limiting** — current rate limiter is per-edge-isolate (best effort). For strict enforcement, use Vercel KV or Upstash Redis as a shared counter.
- **Multi-step token awareness** — with `maxSteps: 3` (search-enabled agents), a single call can consume ~6k output tokens across steps. Consider a per-call cost cap or warning.
