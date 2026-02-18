-- Migration: Credits System & Promo Codes
-- Run this in Supabase SQL Editor if you already have the base schema (schema.sql).
-- Safe to run multiple times — uses IF NOT EXISTS / CREATE OR REPLACE.

-- ============================================
-- MODEL PRICING
-- ============================================
create table if not exists model_pricing (
  model_id text primary key,
  input_cost_per_million numeric(10,4) not null,
  output_cost_per_million numeric(10,4) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into model_pricing (model_id, input_cost_per_million, output_cost_per_million)
values ('moonshotai/kimi-k2', 0.50, 2.40)
on conflict (model_id) do nothing;

-- ============================================
-- USER CREDITS
-- ============================================
create table if not exists user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(10,4) not null default 0,
  lifetime_earned numeric(10,4) not null default 0,
  lifetime_spent numeric(10,4) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CREDIT TRANSACTIONS (audit log)
-- ============================================
create table if not exists credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10,4) not null,
  type text not null,
  source text,
  description text,
  model_id text,
  prompt_tokens int,
  completion_tokens int,
  session_id uuid references sessions(id),
  balance_after numeric(10,4) not null,
  created_at timestamptz default now()
);

create index if not exists idx_credit_transactions_user on credit_transactions(user_id);
create index if not exists idx_credit_transactions_created on credit_transactions(created_at desc);

-- ============================================
-- ATOMIC DEDUCTION RPC
-- ============================================
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

  update user_credits
  set balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into credit_transactions (user_id, amount, type, source, description, model_id, prompt_tokens, completion_tokens, session_id, balance_after)
  values (p_user_id, -p_amount, 'usage', 'agent-call', p_description, p_model_id, p_prompt_tokens, p_completion_tokens, p_session_id, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance, 'cost', p_amount);
end;
$$ language plpgsql security definer;

-- ============================================
-- PROMO CODES
-- ============================================
create table if not exists promo_codes (
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

create table if not exists promo_redemptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  promo_code_id uuid references promo_codes(id) on delete cascade not null,
  credit_amount numeric(10,4) not null,
  created_at timestamptz default now(),
  unique(user_id, promo_code_id)
);

-- Seed "amigos" promo code ($10.00)
insert into promo_codes (code, credit_amount, max_uses, max_uses_per_user, active)
values ('amigos', 10.00, null, 1, true)
on conflict (code) do nothing;

-- ============================================
-- ATOMIC PROMO REDEMPTION RPC
-- ============================================
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
  select * into v_promo
  from promo_codes
  where lower(code) = lower(p_code) and active = true
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  end if;

  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'Promo code has expired');
  end if;

  if v_promo.max_uses is not null and v_promo.current_uses >= v_promo.max_uses then
    return jsonb_build_object('success', false, 'error', 'Promo code has reached its usage limit');
  end if;

  select count(*) into v_user_redemptions
  from promo_redemptions
  where user_id = p_user_id and promo_code_id = v_promo.id;

  if v_user_redemptions >= v_promo.max_uses_per_user then
    return jsonb_build_object('success', false, 'error', 'You have already redeemed this promo code');
  end if;

  insert into user_credits (user_id, balance, lifetime_earned)
  values (p_user_id, v_promo.credit_amount, v_promo.credit_amount)
  on conflict (user_id) do update
  set balance = user_credits.balance + v_promo.credit_amount,
      lifetime_earned = user_credits.lifetime_earned + v_promo.credit_amount,
      updated_at = now();

  select balance into v_new_balance from user_credits where user_id = p_user_id;

  insert into promo_redemptions (user_id, promo_code_id, credit_amount)
  values (p_user_id, v_promo.id, v_promo.credit_amount);

  update promo_codes set current_uses = current_uses + 1 where id = v_promo.id;

  insert into credit_transactions (user_id, amount, type, source, description, balance_after)
  values (p_user_id, v_promo.credit_amount, 'promo', p_code, 'Promo code redemption: ' || p_code, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance, 'credited', v_promo.credit_amount);
end;
$$ language plpgsql security definer;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table user_credits enable row level security;
alter table credit_transactions enable row level security;
alter table promo_codes enable row level security;
alter table promo_redemptions enable row level security;
alter table model_pricing enable row level security;

-- Drop policies first if re-running (idempotent)
drop policy if exists "Users can view their own credits" on user_credits;
drop policy if exists "Users can view their own transactions" on credit_transactions;
drop policy if exists "Promo codes are readable" on promo_codes;
drop policy if exists "Users can view their own redemptions" on promo_redemptions;
drop policy if exists "Model pricing is readable" on model_pricing;

create policy "Users can view their own credits" on user_credits for select using (auth.uid() = user_id);
create policy "Users can view their own transactions" on credit_transactions for select using (auth.uid() = user_id);
create policy "Promo codes are readable" on promo_codes for select using (true);
create policy "Users can view their own redemptions" on promo_redemptions for select using (auth.uid() = user_id);
create policy "Model pricing is readable" on model_pricing for select using (true);
