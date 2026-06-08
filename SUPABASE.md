# Configuración de Supabase

## 1. Crear tabla

En Supabase, abre `SQL Editor` y ejecuta:

```sql
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
```

El mismo SQL está en `supabase/schema.sql`.

## 2. Variables de entorno

Crea `.env.local` en local:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

En Vercel, añade las mismas variables en `Project Settings > Environment Variables`.

## 3. Lanzar

```bash
pnpm run dev
```

La app cargará el estado desde Supabase al abrirse y guardará automáticamente los cambios.

## Nota de seguridad

`SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse en el navegador. Por eso la app usa rutas API de Next en `app/api/state/route.ts`.
