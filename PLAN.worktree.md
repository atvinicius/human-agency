# fix/credits — Credit System Hardening for Production

## Phase 1: Real-time Balance Updates (DONE)
- [x] Fix `fetchBalance()` silent failures — added logging, return boolean
- [x] Subscribe to auth state changes for immediate balance fetch
- [x] Verify orchestrationService + Demo.jsx calls already in place
- [x] All 95 tests pass

## Phase 2: Billing Audit Fixes (DONE)

- [x] **Step 1: Harden `calculateCost()`** — DEFAULT_PRICING fallback for unknown models (never $0)
- [x] **Step 2: Platform markup** — PLATFORM_MARKUP = 1.5 (50% margin) applied to all costs
- [x] **Step 3: Streaming deduction error handling** — try/catch + reconciliation logging in onFinish
- [x] **Step 4: Fail-fast auth** — returns 401 when Supabase not configured but OpenRouter is
- [x] **Step 5: Rate limiting** — per-user sliding window: agent 10/min, credits 20/min, promo 5/min
- [x] **Step 6: Search cost charging** — deductSearchCosts() called in agent-stream.js onFinish
- [x] **Step 7: Consolidate beta credits** — removed auto-grant from checkCredits() and GET /api/credits; DB trigger only
- [x] **Step 8: CORS lockdown** — configurable ALLOWED_ORIGIN env var via getCorsHeaders()
- [x] **Step 9: Promo hardening** — 5 req/min rate limit on redemption endpoint

## Files Modified
- `api/_config/pricing.js` — DEFAULT_PRICING, PLATFORM_MARKUP, updated calculateCost()
- `api/_config/cors.js` — NEW: getCorsHeaders() with ALLOWED_ORIGIN env var
- `api/_middleware/credits.js` — removed auto-grant, added deductSearchCosts()
- `api/_middleware/rateLimit.js` — NEW: sliding-window rate limiter
- `api/agent-stream.js` — rate limiting, CORS, fail-fast auth, deduction error handling, search costs
- `api/agent.js` — rate limiting, CORS, fail-fast auth
- `api/plan-mission.js` — rate limiting, CORS, fail-fast auth, deduction error handling
- `api/credits.js` — rate limiting, CORS, removed beta credit auto-grant
- `src/stores/creditStore.js` — (Phase 1) logging, auth subscription
- `src/services/__tests__/pricing.test.js` — updated for markup + DEFAULT_PRICING

## Tests
- 98 tests pass (95 original + 3 new pricing tests)

## Remaining (future work)
- Email verification + CAPTCHA on signup (Supabase auth config, not code)
- Load pricing from model_pricing DB table (currently hardcoded)
- Multi-step token cap awareness (low priority)
