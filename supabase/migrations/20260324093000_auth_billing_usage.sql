-- Rubrix auth/billing/usage schema
-- Compatible with Supabase Postgres.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.billing_plan_catalog (
  plan_id text primary key,
  display_name text not null,
  monthly_price numeric(10,2) not null check (monthly_price >= 0),
  annual_price numeric(10,2) not null check (annual_price >= 0),
  monthly_word_capacity integer not null check (monthly_word_capacity > 0),
  includes_comments boolean not null default true,
  includes_grade_paper boolean not null default true,
  includes_writing_assist boolean not null default true,
  includes_ai_detector boolean not null default false,
  includes_plagiarism boolean not null default false,
  is_heavy_duty boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.billing_plan_catalog (
  plan_id,
  display_name,
  monthly_price,
  annual_price,
  monthly_word_capacity,
  includes_ai_detector,
  includes_plagiarism,
  is_heavy_duty
)
values
  ('basic', 'Basic', 13.99, 134.30, 200000, false, false, false),
  ('plus', 'Plus', 19.99, 191.90, 200000, true, false, false),
  ('plan_360', '360', 44.99, 431.90, 200000, true, true, false),
  ('basic_hd', 'Basic HD', 29.99, 287.90, 2000000, false, false, true),
  ('plus_hd', 'Plus HD', 59.99, 575.90, 2000000, true, false, true),
  ('plan_360_hd', '360 HD', 119.99, 1151.90, 2000000, true, true, true)
on conflict (plan_id) do update
set
  display_name = excluded.display_name,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  monthly_word_capacity = excluded.monthly_word_capacity,
  includes_ai_detector = excluded.includes_ai_detector,
  includes_plagiarism = excluded.includes_plagiarism,
  is_heavy_duty = excluded.is_heavy_duty,
  updated_at = now();

create trigger set_updated_at_billing_plan_catalog
before update on public.billing_plan_catalog
for each row execute function public.set_updated_at();

create table if not exists public.billing_topup_catalog (
  topup_type text primary key check (topup_type in ('core', 'ai_detection', 'plagiarism')),
  display_name text not null,
  words_per_pack integer not null check (words_per_pack > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.billing_topup_catalog (topup_type, display_name, words_per_pack)
values
  ('core', 'Grading/Writing top-up', 50000),
  ('ai_detection', 'AI detection top-up', 50000),
  ('plagiarism', 'Plagiarism top-up', 50000)
on conflict (topup_type) do update
set
  display_name = excluded.display_name,
  words_per_pack = excluded.words_per_pack,
  updated_at = now();

create trigger set_updated_at_billing_topup_catalog
before update on public.billing_topup_catalog
for each row execute function public.set_updated_at();

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_billing_customers
before update on public.billing_customers
for each row execute function public.set_updated_at();

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null references public.billing_plan_catalog(plan_id),
  billing_interval text not null check (billing_interval in ('monthly', 'annual')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_subscriptions_user_id on public.billing_subscriptions(user_id);
create index if not exists idx_billing_subscriptions_status on public.billing_subscriptions(status);

create trigger set_updated_at_billing_subscriptions
before update on public.billing_subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.billing_topup_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topup_type text not null references public.billing_topup_catalog(topup_type),
  words integer not null check (words > 0),
  cycle_key text not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_topup_purchases_user_cycle on public.billing_topup_purchases(user_id, cycle_key);

create table if not exists public.billing_usage_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_code text not null check (feature_code in ('comments', 'grade_paper', 'writing_assist', 'ai_detector', 'plagiarism')),
  topup_type text not null check (topup_type in ('core', 'ai_detection', 'plagiarism')),
  words integer not null check (words > 0),
  consumed_from_base integer not null default 0 check (consumed_from_base >= 0),
  consumed_from_topup integer not null default 0 check (consumed_from_topup >= 0),
  cycle_key text not null,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_usage_ledger_user_cycle on public.billing_usage_ledger(user_id, cycle_key);
create index if not exists idx_billing_usage_ledger_created_at on public.billing_usage_ledger(created_at desc);

create table if not exists public.billing_stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create or replace function public.current_cycle_key(ts timestamptz default now())
returns text
language sql
stable
as $$
  select to_char(date_trunc('month', ts), 'YYYY-MM');
$$;

create or replace function public.plan_has_feature(p_plan_id text, p_feature_code text)
returns boolean
language sql
stable
as $$
  select case
    when p_plan_id = 'trial' then true
    when p_feature_code = 'comments' then coalesce(includes_comments, false)
    when p_feature_code = 'grade_paper' then coalesce(includes_grade_paper, false)
    when p_feature_code = 'writing_assist' then coalesce(includes_writing_assist, false)
    when p_feature_code = 'ai_detector' then coalesce(includes_ai_detector, false)
    when p_feature_code = 'plagiarism' then coalesce(includes_plagiarism, false)
    else false
  end
  from public.billing_plan_catalog
  where plan_id = p_plan_id;
$$;

create or replace function public.billing_apply_stripe_event(event_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id text := coalesce(event_payload->>'id', '');
  v_event_type text := coalesce(event_payload->>'type', '');
  v_object jsonb := coalesce(event_payload#>'{data,object}', '{}'::jsonb);
  v_metadata jsonb := coalesce(v_object->'metadata', '{}'::jsonb);
  v_user_id uuid;
  v_kind text := coalesce(v_metadata->>'kind', '');
  v_plan_id text := coalesce(v_metadata->>'plan_id', '');
  v_billing_interval text := coalesce(v_metadata->>'billing_interval', 'monthly');
  v_topup_type text := coalesce(v_metadata->>'topup_type', '');
  v_cycle_key text := public.current_cycle_key(now());
  v_status text := 'active';
begin
  if v_event_id = '' then
    return jsonb_build_object('ok', false, 'message', 'Event payload missing id.');
  end if;

  if exists(select 1 from public.billing_stripe_events where stripe_event_id = v_event_id) then
    return jsonb_build_object('ok', true, 'message', 'Duplicate event ignored.');
  end if;

  insert into public.billing_stripe_events (stripe_event_id, event_type, payload)
  values (v_event_id, v_event_type, event_payload);

  begin
    v_user_id := nullif(v_metadata->>'user_id', '')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if v_user_id is null then
    return jsonb_build_object('ok', true, 'message', 'Event stored without user linkage.');
  end if;

  if coalesce(v_object->>'customer', '') <> '' then
    insert into public.billing_customers (user_id, stripe_customer_id)
    values (v_user_id, v_object->>'customer')
    on conflict (user_id) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          updated_at = now();
  end if;

  if v_event_type = 'checkout.session.completed' and v_kind = 'subscription' then
    if v_plan_id = '' then
      return jsonb_build_object('ok', false, 'message', 'Subscription checkout missing plan_id metadata.');
    end if;

    if v_billing_interval not in ('monthly', 'annual') then
      v_billing_interval := 'monthly';
    end if;

    insert into public.billing_subscriptions (
      user_id,
      plan_id,
      billing_interval,
      status,
      stripe_subscription_id,
      stripe_price_id,
      current_period_start,
      current_period_end
    )
    values (
      v_user_id,
      v_plan_id,
      v_billing_interval,
      'active',
      nullif(v_object->>'subscription', ''),
      nullif(v_object#>>'{line_items,data,0,price,id}', ''),
      null,
      null
    )
    on conflict (user_id) do update
      set plan_id = excluded.plan_id,
          billing_interval = excluded.billing_interval,
          status = excluded.status,
          stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.billing_subscriptions.stripe_subscription_id),
          stripe_price_id = coalesce(excluded.stripe_price_id, public.billing_subscriptions.stripe_price_id),
          updated_at = now();
  elsif v_event_type = 'checkout.session.completed' and v_kind = 'topup' then
    if v_topup_type not in ('core', 'ai_detection', 'plagiarism') then
      return jsonb_build_object('ok', false, 'message', 'Top-up checkout has invalid topup_type metadata.');
    end if;

    insert into public.billing_topup_purchases (
      user_id,
      topup_type,
      words,
      cycle_key,
      stripe_checkout_session_id,
      stripe_payment_intent_id
    )
    values (
      v_user_id,
      v_topup_type,
      50000,
      v_cycle_key,
      nullif(v_object->>'id', ''),
      nullif(v_object->>'payment_intent', '')
    );
  elsif v_event_type in ('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted') then
    if v_event_type = 'customer.subscription.deleted' then
      v_status := 'canceled';
    else
      v_status := case
        when coalesce(v_object->>'status', '') in ('trialing', 'active', 'past_due', 'canceled') then v_object->>'status'
        else 'active'
      end;
    end if;

    update public.billing_subscriptions
    set
      status = v_status,
      stripe_subscription_id = coalesce(nullif(v_object->>'id', ''), stripe_subscription_id),
      cancel_at_period_end = coalesce((v_object->>'cancel_at_period_end')::boolean, cancel_at_period_end),
      updated_at = now()
    where user_id = v_user_id;
  elsif v_event_type = 'invoice.payment_failed' then
    update public.billing_subscriptions
    set status = 'past_due',
        updated_at = now()
    where user_id = v_user_id;
  elsif v_event_type = 'invoice.paid' then
    update public.billing_subscriptions
    set status = 'active',
        updated_at = now()
    where user_id = v_user_id;
  end if;

  return jsonb_build_object('ok', true, 'message', 'Stripe event applied.');
end;
$$;

grant execute on function public.billing_apply_stripe_event(jsonb) to service_role;

create or replace view public.billing_cycle_usage_v as
select
  user_id,
  cycle_key,
  coalesce(sum(consumed_from_base), 0)::bigint as base_words_used,
  coalesce(sum(consumed_from_topup), 0)::bigint as topup_words_used,
  coalesce(sum(words), 0)::bigint as total_words_used
from public.billing_usage_ledger
group by user_id, cycle_key;

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_topup_purchases enable row level security;
alter table public.billing_usage_ledger enable row level security;

drop policy if exists "billing_customers_select_own" on public.billing_customers;
create policy "billing_customers_select_own"
on public.billing_customers
for select
using (auth.uid() = user_id);

drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
on public.billing_subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "billing_topup_purchases_select_own" on public.billing_topup_purchases;
create policy "billing_topup_purchases_select_own"
on public.billing_topup_purchases
for select
using (auth.uid() = user_id);

drop policy if exists "billing_usage_ledger_select_own" on public.billing_usage_ledger;
create policy "billing_usage_ledger_select_own"
on public.billing_usage_ledger
for select
using (auth.uid() = user_id);

drop policy if exists "billing_usage_ledger_insert_own" on public.billing_usage_ledger;
create policy "billing_usage_ledger_insert_own"
on public.billing_usage_ledger
for insert
with check (auth.uid() = user_id);

grant select on public.billing_plan_catalog to anon, authenticated;
grant select on public.billing_topup_catalog to anon, authenticated;
grant select on public.billing_cycle_usage_v to authenticated;

