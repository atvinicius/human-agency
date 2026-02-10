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
  model text default 'anthropic/claude-3.5-sonnet',
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
create policy "Users can create sessions" on sessions for insert with check (true);
create policy "Users can update their own sessions" on sessions for update using (
  auth.uid() = user_id or user_id is null
);

-- Agents: follow session access
create policy "Users can view agents in their sessions" on agents for select using (
  exists (select 1 from sessions where sessions.id = agents.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Users can create agents" on agents for insert with check (true);
create policy "Users can update agents" on agents for update using (true);

-- Events: follow session access
create policy "Users can view events in their sessions" on events for select using (
  exists (select 1 from sessions where sessions.id = events.session_id and (sessions.user_id = auth.uid() or sessions.user_id is null))
);
create policy "Events can be created" on events for insert with check (true);

-- Messages and Artifacts: follow agent access
create policy "Users can view agent messages" on agent_messages for select using (true);
create policy "Messages can be created" on agent_messages for insert with check (true);

create policy "Users can view artifacts" on artifacts for select using (true);
create policy "Artifacts can be created" on artifacts for insert with check (true);

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
