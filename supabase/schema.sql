-- Human Agency Database Schema
-- Run this in Supabase SQL Editor (supabase.com → Your Project → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PRESETS: Pre-defined scenarios for demos
-- ============================================
create table presets (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text, -- emoji or icon name
  category text not null, -- 'development', 'research', 'content', 'business'
  initial_objective text not null,
  agent_config jsonb not null default '{}', -- initial agent tree structure
  estimated_agents int default 10,
  estimated_duration text, -- "5 minutes", "15 minutes"
  showcase_points text[] default '{}', -- key value propositions demonstrated
  created_at timestamptz default now()
);

-- ============================================
-- SESSIONS: User orchestration sessions
-- ============================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  preset_id uuid references presets(id),
  name text not null,
  status text not null default 'active', -- 'active', 'paused', 'completed', 'failed'
  objective text not null,
  metadata jsonb default '{}',
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- AGENTS: Individual AI agents
-- ============================================
create table agents (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  parent_id uuid references agents(id) on delete set null,

  -- Identity
  name text not null,
  role text not null, -- 'coordinator', 'researcher', 'executor', 'validator', 'synthesizer'

  -- State
  status text not null default 'spawning', -- 'spawning', 'working', 'waiting', 'paused', 'blocked', 'completed', 'failed'
  priority text not null default 'normal', -- 'critical', 'high', 'normal', 'low', 'background'
  progress int default 0 check (progress >= 0 and progress <= 100),

  -- Work
  objective text not null,
  current_activity text,
  context jsonb default '{}', -- accumulated knowledge/state

  -- Human interaction
  pending_input jsonb, -- null if no input needed

  -- AI config
  model text default 'moonshotai/kimi-k2',
  system_prompt text,

  -- Timing
  spawned_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AGENT_MESSAGES: Conversation history per agent
-- ============================================
create table agent_messages (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id) on delete cascade not null,
  role text not null, -- 'system', 'user', 'assistant'
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================
-- EVENTS: Activity stream for UI
-- ============================================
create table events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade,

  type text not null, -- 'spawn', 'status', 'progress', 'activity', 'complete', 'fail', 'input_request', 'input_response', 'insight'
  message text not null,
  metadata jsonb default '{}',

  created_at timestamptz default now()
);

-- ============================================
-- ARTIFACTS: Outputs produced by agents
-- ============================================
create table artifacts (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  agent_id uuid references agents(id) on delete cascade not null,

  type text not null, -- 'code', 'document', 'analysis', 'plan', 'data'
  name text not null,
  content text not null,
  metadata jsonb default '{}',

  created_at timestamptz default now()
);

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_agents_session on agents(session_id);
create index idx_agents_parent on agents(parent_id);
create index idx_agents_status on agents(status);
create index idx_events_session on events(session_id);
create index idx_events_created on events(created_at desc);
create index idx_agent_messages_agent on agent_messages(agent_id);
create index idx_artifacts_session on artifacts(session_id);

-- ============================================
-- REALTIME: Enable for live updates
-- ============================================
alter publication supabase_realtime add table agents;
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table sessions;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table presets enable row level security;
alter table sessions enable row level security;
alter table agents enable row level security;
alter table events enable row level security;
alter table agent_messages enable row level security;
alter table artifacts enable row level security;

-- Presets are public read
create policy "Presets are viewable by everyone" on presets for select using (true);

-- Sessions: users see their own, or anonymous sessions
create policy "Users can view their own sessions" on sessions for select using (
  auth.uid() = user_id or user_id is null
);
create policy "Users can create their own sessions" on sessions for insert with check (
  auth.uid() = user_id or user_id is null
);
create policy "Users can update their own sessions" on sessions for update using (
  auth.uid() = user_id or user_id is null
);

-- Agents: follow session access
create policy "Users can view agents in their sessions" on agents for select using (
  exists (select 1 from sessions where sessions.id = agents.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can create agents in their sessions" on agents for insert with check (
  exists (select 1 from sessions where sessions.id = agents.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can update agents in their sessions" on agents for update using (
  exists (select 1 from sessions where sessions.id = agents.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);

-- Events: follow session access
create policy "Users can view events in their sessions" on events for select using (
  exists (select 1 from sessions where sessions.id = events.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can create events in their sessions" on events for insert with check (
  exists (select 1 from sessions where sessions.id = events.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);

-- Messages: follow session access via agent
create policy "Users can view messages in their sessions" on agent_messages for select using (
  exists (select 1 from agents join sessions on sessions.id = agents.session_id where agents.id = agent_messages.agent_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can create messages in their sessions" on agent_messages for insert with check (
  exists (select 1 from agents join sessions on sessions.id = agents.session_id where agents.id = agent_messages.agent_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);

-- Artifacts: follow session access
create policy "Users can view artifacts in their sessions" on artifacts for select using (
  exists (select 1 from sessions where sessions.id = artifacts.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can create artifacts in their sessions" on artifacts for insert with check (
  exists (select 1 from sessions where sessions.id = artifacts.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);

-- ============================================
-- CREDITS SYSTEM
-- ============================================

-- Model pricing reference
create table model_pricing (
  model_id text primary key,
  input_cost_per_million numeric(10,4) not null,
  output_cost_per_million numeric(10,4) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed Kimi K2 pricing
insert into model_pricing (model_id, input_cost_per_million, output_cost_per_million) values
  ('moonshotai/kimi-k2', 0.50, 2.40);

-- User credit balances
create table user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(10,4) not null default 0,
  lifetime_earned numeric(10,4) not null default 0,
  lifetime_spent numeric(10,4) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Credit transaction audit log
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10,4) not null, -- positive = credit, negative = debit
  type text not null, -- 'promo', 'usage', 'admin', 'refund'
  source text, -- 'amigos', 'agent-call', etc.
  description text,
  model_id text,
  prompt_tokens int,
  completion_tokens int,
  session_id uuid references sessions(id),
  balance_after numeric(10,4) not null,
  created_at timestamptz default now()
);

create index idx_credit_transactions_user on credit_transactions(user_id);
create index idx_credit_transactions_created on credit_transactions(created_at desc);

-- Atomic deduction RPC (prevents race conditions)
create or replace function deduct_credits(
  p_user_id uuid,
  p_amount numeric,
  p_model_id text default null,
  p_prompt_tokens int default null,
  p_completion_tokens int default null,
  p_session_id uuid default null,
  p_description text default 'API usage'
) returns jsonb as $$
declare
  v_balance numeric;
  v_new_balance numeric;
begin
  -- Lock the row for update
  select balance into v_balance
  from user_credits
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'No credit record found');
  end if;

  v_new_balance := v_balance - p_amount;

  if v_new_balance < 0 then
    return jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_balance);
  end if;

  -- Update balance
  update user_credits
  set balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = now()
  where user_id = p_user_id;

  -- Log transaction
  insert into credit_transactions (user_id, amount, type, source, description, model_id, prompt_tokens, completion_tokens, session_id, balance_after)
  values (p_user_id, -p_amount, 'usage', 'agent-call', p_description, p_model_id, p_prompt_tokens, p_completion_tokens, p_session_id, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance, 'cost', p_amount);
end;
$$ language plpgsql security definer;

-- ============================================
-- PROMO CODES
-- ============================================

create table promo_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  credit_amount numeric(10,4) not null,
  max_uses int,
  current_uses int not null default 0,
  max_uses_per_user int not null default 1,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table promo_redemptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  promo_code_id uuid references promo_codes(id) on delete cascade not null,
  credit_amount numeric(10,4) not null,
  created_at timestamptz default now(),
  unique(user_id, promo_code_id)
);

-- Seed "amigos" promo code ($10.00)
insert into promo_codes (code, credit_amount, max_uses, max_uses_per_user, active) values
  ('amigos', 10.00, null, 1, true);

-- Atomic promo code redemption RPC
create or replace function redeem_promo_code(
  p_user_id uuid,
  p_code text
) returns jsonb as $$
declare
  v_promo promo_codes%rowtype;
  v_user_redemptions int;
  v_balance numeric;
  v_new_balance numeric;
begin
  -- Find and lock the promo code
  select * into v_promo
  from promo_codes
  where lower(code) = lower(p_code) and active = true
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  end if;

  -- Check expiry
  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'Promo code has expired');
  end if;

  -- Check global usage limit
  if v_promo.max_uses is not null and v_promo.current_uses >= v_promo.max_uses then
    return jsonb_build_object('success', false, 'error', 'Promo code has reached its usage limit');
  end if;

  -- Check per-user usage limit
  select count(*) into v_user_redemptions
  from promo_redemptions
  where user_id = p_user_id and promo_code_id = v_promo.id;

  if v_user_redemptions >= v_promo.max_uses_per_user then
    return jsonb_build_object('success', false, 'error', 'You have already redeemed this promo code');
  end if;

  -- Upsert user credits
  insert into user_credits (user_id, balance, lifetime_earned)
  values (p_user_id, v_promo.credit_amount, v_promo.credit_amount)
  on conflict (user_id) do update
  set balance = user_credits.balance + v_promo.credit_amount,
      lifetime_earned = user_credits.lifetime_earned + v_promo.credit_amount,
      updated_at = now();

  -- Get new balance
  select balance into v_new_balance from user_credits where user_id = p_user_id;

  -- Record redemption
  insert into promo_redemptions (user_id, promo_code_id, credit_amount)
  values (p_user_id, v_promo.id, v_promo.credit_amount);

  -- Increment usage counter
  update promo_codes set current_uses = current_uses + 1 where id = v_promo.id;

  -- Log transaction
  insert into credit_transactions (user_id, amount, type, source, description, balance_after)
  values (p_user_id, v_promo.credit_amount, 'promo', p_code, 'Promo code redemption: ' || p_code, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance, 'credited', v_promo.credit_amount);
end;
$$ language plpgsql security definer;

-- Credits RLS
alter table user_credits enable row level security;
alter table credit_transactions enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table model_pricing enable row level security;

create policy "Users can view their own credits" on user_credits for select using (auth.uid() = user_id);
create policy "Users can view their own transactions" on credit_transactions for select using (auth.uid() = user_id);
create policy "Promo codes are readable" on promo_codes for select using (true);
create policy "Users can view their own redemptions" on promo_redemptions for select using (auth.uid() = user_id);
create policy "Model pricing is readable" on model_pricing for select using (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agents_updated_at before update on agents
  for each row execute function update_updated_at();

-- ============================================
-- SEED: Initial Presets
-- ============================================
insert into presets (slug, name, description, icon, category, initial_objective, agent_config, estimated_agents, estimated_duration, showcase_points) values
(
  'solo-saas',
  'Solo SaaS Builder',
  'Watch one person direct an army of agents to build a complete SaaS product - from market research to deployed MVP.',
  '🚀',
  'development',
  'Build a complete task management SaaS with user auth, real-time sync, and Stripe billing',
  '{
    "root": {
      "role": "coordinator",
      "name": "Project Lead",
      "children": [
        {
          "role": "researcher",
          "name": "Market Analyst",
          "objective": "Research competitor landscape and identify unique value proposition"
        },
        {
          "role": "coordinator",
          "name": "Tech Lead",
          "children": [
            {"role": "executor", "name": "Backend Engineer", "objective": "Design and implement API architecture"},
            {"role": "executor", "name": "Frontend Engineer", "objective": "Build React UI components"},
            {"role": "executor", "name": "DevOps Engineer", "objective": "Set up CI/CD and infrastructure"}
          ]
        },
        {
          "role": "researcher",
          "name": "UX Researcher",
          "objective": "Define user personas and optimal user flows"
        }
      ]
    }
  }',
  25,
  '10 minutes',
  array['One person = entire dev team', 'Parallel execution at scale', 'Real-time coordination']
),
(
  'due-diligence',
  'Investment Due Diligence',
  'Analyze a target company for investment - financials, market position, risks, team assessment - in minutes instead of weeks.',
  '📊',
  'research',
  'Conduct comprehensive due diligence on Acme Corp for Series B investment consideration',
  '{
    "root": {
      "role": "coordinator",
      "name": "Lead Analyst",
      "children": [
        {
          "role": "researcher",
          "name": "Financial Analyst",
          "objective": "Analyze financial statements, unit economics, and projections",
          "children": [
            {"role": "validator", "name": "Auditor", "objective": "Verify financial claims and flag inconsistencies"}
          ]
        },
        {
          "role": "researcher",
          "name": "Market Analyst",
          "objective": "Assess TAM, competition, and market dynamics"
        },
        {
          "role": "researcher",
          "name": "Technical Analyst",
          "objective": "Evaluate technology stack, IP, and technical moat"
        },
        {
          "role": "researcher",
          "name": "Team Analyst",
          "objective": "Research founders, key hires, and organizational capability"
        },
        {
          "role": "synthesizer",
          "name": "Report Writer",
          "objective": "Synthesize findings into investment memo"
        }
      ]
    }
  }',
  15,
  '8 minutes',
  array['Weeks of analysis in minutes', 'Parallel research streams', 'Comprehensive coverage']
),
(
  'content-empire',
  'Content Empire',
  'One creator orchestrating agents to produce, adapt, and distribute content across every platform simultaneously.',
  '🎬',
  'content',
  'Create a viral content piece and adapt it for YouTube, Twitter, LinkedIn, TikTok, and newsletter',
  '{
    "root": {
      "role": "coordinator",
      "name": "Content Director",
      "children": [
        {
          "role": "researcher",
          "name": "Trend Analyst",
          "objective": "Identify trending topics and optimal angles"
        },
        {
          "role": "executor",
          "name": "Script Writer",
          "objective": "Write compelling core narrative"
        },
        {
          "role": "coordinator",
          "name": "Distribution Lead",
          "children": [
            {"role": "executor", "name": "YouTube Adapter", "objective": "Create long-form video script with hooks"},
            {"role": "executor", "name": "Twitter Strategist", "objective": "Create thread with optimal structure"},
            {"role": "executor", "name": "LinkedIn Writer", "objective": "Adapt for professional audience"},
            {"role": "executor", "name": "TikTok Creator", "objective": "Create short-form hooks and scripts"},
            {"role": "executor", "name": "Newsletter Editor", "objective": "Create email version with CTAs"}
          ]
        },
        {
          "role": "validator",
          "name": "Brand Checker",
          "objective": "Ensure consistency and brand alignment across all formats"
        }
      ]
    }
  }',
  12,
  '6 minutes',
  array['One idea → every platform', 'Consistent brand voice', 'Parallel content creation']
),
(
  'legacy-migration',
  'Legacy Code Migration',
  'Migrate a legacy codebase to modern stack - analysis, planning, execution, and validation with full test coverage.',
  '🔄',
  'development',
  'Migrate legacy jQuery/PHP application to React/Node.js with TypeScript',
  '{
    "root": {
      "role": "coordinator",
      "name": "Migration Architect",
      "children": [
        {
          "role": "researcher",
          "name": "Codebase Analyst",
          "objective": "Map existing codebase structure, dependencies, and patterns",
          "children": [
            {"role": "researcher", "name": "API Mapper", "objective": "Document all API endpoints and data flows"},
            {"role": "researcher", "name": "DB Analyst", "objective": "Analyze database schema and queries"}
          ]
        },
        {
          "role": "executor",
          "name": "Migration Planner",
          "objective": "Create phased migration plan with rollback strategies"
        },
        {
          "role": "coordinator",
          "name": "Implementation Lead",
          "children": [
            {"role": "executor", "name": "Backend Migrator", "objective": "Migrate PHP to Node.js/TypeScript"},
            {"role": "executor", "name": "Frontend Migrator", "objective": "Migrate jQuery to React"},
            {"role": "executor", "name": "Test Writer", "objective": "Write comprehensive test suite"}
          ]
        },
        {
          "role": "validator",
          "name": "QA Lead",
          "objective": "Validate functional parity and regression testing"
        }
      ]
    }
  }',
  20,
  '12 minutes',
  array['Complex migrations simplified', 'Parallel workstreams', 'Built-in validation']
),
(
  'market-launch',
  'Product Launch',
  'Launch a new product with comprehensive market research, positioning, pricing, and go-to-market strategy.',
  '🎯',
  'business',
  'Develop complete go-to-market strategy for launching an AI writing assistant',
  '{
    "root": {
      "role": "coordinator",
      "name": "Launch Commander",
      "children": [
        {
          "role": "researcher",
          "name": "Market Researcher",
          "objective": "Analyze market size, segments, and opportunity",
          "children": [
            {"role": "researcher", "name": "Competitor Analyst", "objective": "Deep dive on competitor positioning and gaps"}
          ]
        },
        {
          "role": "researcher",
          "name": "Customer Researcher",
          "objective": "Define ICP, personas, and buying triggers"
        },
        {
          "role": "executor",
          "name": "Positioning Strategist",
          "objective": "Develop unique positioning and messaging framework"
        },
        {
          "role": "executor",
          "name": "Pricing Analyst",
          "objective": "Design pricing strategy and packaging"
        },
        {
          "role": "coordinator",
          "name": "GTM Lead",
          "children": [
            {"role": "executor", "name": "Channel Strategist", "objective": "Define distribution channels and partnerships"},
            {"role": "executor", "name": "Launch Planner", "objective": "Create detailed launch timeline and milestones"},
            {"role": "executor", "name": "Content Strategist", "objective": "Plan launch content and PR strategy"}
          ]
        },
        {
          "role": "synthesizer",
          "name": "Strategy Synthesizer",
          "objective": "Compile comprehensive GTM playbook"
        }
      ]
    }
  }',
  18,
  '10 minutes',
  array['Strategic depth at speed', 'Cross-functional coordination', 'Actionable deliverables']
);
