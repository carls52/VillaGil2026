import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("[Supabase Server] URL:", supabaseUrl ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("[Supabase Server] Key:", supabaseKey ? "✓ Configurada" : "✗ NO CONFIGURADA");

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Server] Error: Faltan credenciales públicas");
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  console.log("[Supabase Server] Creando cliente con SSR");
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          const cookies = cookieStore.getAll();
          console.log("[Supabase Server] Cookies obtenidas:", cookies.length);
          return cookies;
        },
        setAll(cookiesToSet) {
          try {
            console.log("[Supabase Server] Configurando cookies:", cookiesToSet.length);
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch (error) {
            console.log("[Supabase Server] No se pudieron configurar cookies (Server Component):", error instanceof Error ? error.message : "");
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
