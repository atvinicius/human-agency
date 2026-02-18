-- Migration: Server-Side Orchestration
-- Adds columns and tables needed for server-driven agent execution.
-- Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ============================================
-- AGENTS: new columns for server-side tracking
-- ============================================
alter table agents add column if not exists depth int default 0;
alter table agents add column if not exists iteration int default 0;
alter table agents add column if not exists last_completion_check timestamptz;
alter table agents add column if not exists completion_output text;

-- ============================================
-- AGENT_MESSAGES: explicit ordering
-- ============================================
-- seq column for deterministic message ordering (timestamps can collide)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'agent_messages' and column_name = 'seq'
  ) then
    -- Create a sequence for agent_messages ordering
    create sequence if not exists agent_messages_seq_seq;
    alter table agent_messages add column seq int default nextval('agent_messages_seq_seq');
  end if;
end$$;

create index if not exists idx_agent_messages_seq on agent_messages(agent_id, seq);

-- ============================================
-- SESSIONS: search count tracking
-- ============================================
alter table sessions add column if not exists search_count int default 0;

-- Index on user_id (missing from base schema)
create index if not exists idx_sessions_user_id on sessions(user_id);

-- ============================================
-- REPORT_SECTIONS: persistent mission output
-- ============================================
create table if not exists report_sections (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  agent_name text not null,
  role text,
  title text,
  content text not null,
  type text not null default 'output',  -- 'output', 'artifact', 'synthesis'
  created_at timestamptz default now()
);

create index if not exists idx_report_sections_session on report_sections(session_id);

-- ============================================
-- FINDINGS: persistent inter-agent collaboration
-- ============================================
create table if not exists findings (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  agent_name text not null,
  agent_role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_findings_session on findings(session_id);

-- ============================================
-- REALTIME: add new tables to publication
-- ============================================
do $$
begin
  -- report_sections
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'report_sections'
  ) then
    alter publication supabase_realtime add table report_sections;
  end if;
  -- findings
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'findings'
  ) then
    alter publication supabase_realtime add table findings;
  end if;
  -- agents (ensure it's in realtime)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'agents'
  ) then
    alter publication supabase_realtime add table agents;
  end if;
  -- events (ensure it's in realtime)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table events;
  end if;
end$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table report_sections enable row level security;
alter table findings enable row level security;

-- report_sections: users can read their own session's reports
drop policy if exists "Users can view their session reports" on report_sections;
create policy "Users can view their session reports" on report_sections
  for select using (
    session_id in (select id from sessions where user_id = auth.uid())
  );

-- report_sections: service role can insert (server-side orchestration)
drop policy if exists "Service can insert report sections" on report_sections;
create policy "Service can insert report sections" on report_sections
  for insert with check (true);

-- findings: users can read their own session's findings
drop policy if exists "Users can view their session findings" on findings;
create policy "Users can view their session findings" on findings
  for select using (
    session_id in (select id from sessions where user_id = auth.uid())
  );

-- findings: service role can insert
drop policy if exists "Service can insert findings" on findings;
create policy "Service can insert findings" on findings
  for insert with check (true);

-- ============================================
-- RPC: claim one agent for server-side iteration
-- Uses FOR UPDATE SKIP LOCKED for safe concurrency
-- ============================================
create or replace function claim_agent_for_iteration(p_session_id uuid)
returns jsonb as $$
declare
  v_agent agents%rowtype;
begin
  select * into v_agent
  from agents
  where session_id = p_session_id
    and status = 'working'
  order by priority desc, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return null;
  end if;

  return to_jsonb(v_agent);
end;
$$ language plpgsql security definer;

-- ============================================
-- RPC: transition spawning agents to working
-- ============================================
create or replace function activate_spawning_agents(p_session_id uuid)
returns int as $$
declare
  v_count int;
begin
  update agents
  set status = 'working',
      current_activity = 'Analyzing objective...'
  where session_id = p_session_id
    and status = 'spawning';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql security definer;
