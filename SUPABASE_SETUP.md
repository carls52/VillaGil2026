# Configuración de Supabase - Pasos Finales

## ✅ Lo que ya se ha hecho:

1. **Instalados paquetes necesarios**: `@supabase/ssr`, `@supabase/supabase-js`
2. **Archivos de utilidades creados**:
   - `utils/supabase/server.ts` - Cliente para uso en Server Components
   - `utils/supabase/client.ts` - Cliente para uso en Browser/Client Components
   - `utils/supabase/middleware.ts` - Middleware para mantener sesiones sincronizadas
3. **Middleware configurado**: `middleware.ts` en la raíz del proyecto
4. **Variables de entorno públicas**: Configuradas en `.env.local` y `.env.example`
5. **API de estado lista**: El endpoint `/api/state` ya está preparado para usar Supabase

## 🔑 Paso Final - Obtener la Service Role Key:

Para que las operaciones del servidor funcionen (lectura/escritura de datos en Supabase):

1. Ve a [tu proyecto Supabase](https://app.supabase.com/)
2. Selecciona el proyecto "cwxiudtxamtldluvygif"
3. Ve a **Settings > API** en la barra lateral
4. Copia el valor de **"Service role (secret)"** (la clave privada, empieza con `eyJhbGc...`)
5. Pega este valor en `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

## 🚀 Verificar la configuración:

```bash
# Reinicia el servidor de desarrollo
pnpm dev
```

Si todo está correcto:
- El proyecto cargará datos de Supabase automáticamente
- Los cambios en la app se guardarán en Supabase
- Verás "Datos sincronizados" en la interfaz

## 📋 Tabla necesaria en Supabase:

Si no existe, ejecuta en el SQL Editor de Supabase:

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

## 🔐 Seguridad:

- **`.env.local`**: NO subir a git (ya está en `.gitignore`)
- **`.env.example`**: Mostrar estructura sin valores sensibles
- **Service Role Key**: Nunca exponerla en cliente, solo en servidor

¡Listo! Supabase debería estar completamente integrado. 🎉
