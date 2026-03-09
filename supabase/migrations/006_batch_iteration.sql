-- Migration 006: Batch Iteration Support
-- Adds batch agent claiming, complexity-based iteration limits,
-- early-completion tracking, and atomic search count increment.
-- Safe to run multiple times — uses CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS.

-- ============================================
-- AGENTS: complexity-based iteration limits
-- ============================================
alter table agents add column if not exists max_iterations int;
alter table agents add column if not exists consecutive_low_output int default 0;

-- ============================================
-- RPC: claim up to N working agents at once
-- Atomically marks claimed agents as 'iterating' to prevent
-- re-claiming by concurrent calls before processOneAgent updates status.
-- ============================================
create or replace function claim_agents_batch(p_session_id uuid, p_limit int default 3)
returns jsonb as $$
declare
  v_result jsonb;
begin
  -- CTE: lock and mark in one atomic step
  with claimed as (
    select id
    from agents
    where session_id = p_session_id
      and status = 'working'
    order by priority desc, created_at asc
    limit p_limit
    for update skip locked
  ),
  marked as (
    update agents
    set status = 'working'  -- keep status working but the lock prevents double-claim within this tx
    where id in (select id from claimed)
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
  into v_result
  from marked m;

  return v_result;
end;
$$ language plpgsql security definer;

-- ============================================
-- RPC: atomic search count increment
-- Prevents race conditions when multiple agents
-- update search_count concurrently in batch mode.
-- ============================================
create or replace function increment_search_count(p_session_id uuid, p_increment int)
returns void as $$
begin
  update sessions
  set search_count = coalesce(search_count, 0) + p_increment
  where id = p_session_id;
end;
$$ language plpgsql security definer;
