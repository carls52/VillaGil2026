create table if not exists public.app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Sin acceso publico directo" on public.app_state;

create policy "Sin acceso publico directo"
on public.app_state
for all
using (false)
with check (false);
