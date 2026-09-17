-- StayCore shortlet schema (Supabase/Postgres, RLS by tenant_id)
create table if not exists signals (
  id text primary key, tenant_id text not null, source text not null, provider text not null,
  intent text not null, urgency int not null check (urgency between 1 and 5),
  status text not null default 'pending', assigned_agent text,
  raw jsonb not null default '{}', normalized jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists tasks (
  id text primary key, tenant_id text not null, signal_id text references signals(id),
  title text not null, description text, status text not null default 'TRIAGE',
  assigned_agent text not null, tier int not null default 2 check (tier in (1,2,3)),
  payload jsonb not null default '{}', cost_usd numeric, cost_ngn numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists approvals (
  id text primary key, tenant_id text not null, task_id text not null references tasks(id),
  tier int not null check (tier in (1,2,3)), action_type text not null,
  payload jsonb not null default '{}', status text not null default 'pending',
  requested_by text not null, decided_by text, decided_at timestamptz,
  confirm_token text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists audit_events (
  id text primary key, seq bigint not null, tenant_id text not null, task_id text not null,
  signal_id text, actor jsonb not null, action text not null,
  tool_name text, tool_input jsonb, tool_output jsonb, model text,
  tokens jsonb, cost_ngn numeric, latency_ms int, status text,
  prev_hash text not null, hash text not null, created_at timestamptz not null default now()
);
alter table signals enable row level security;
alter table tasks enable row level security;
alter table approvals enable row level security;
alter table audit_events enable row level security;
-- policies (service role bypasses; anon scoped by jwt tenant claim):
-- create policy tenant_isolation on signals for all using (tenant_id = current_setting('app.tenant_id', true));
