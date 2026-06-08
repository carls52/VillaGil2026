import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("[Supabase Admin] URL:", supabaseUrl ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("[Supabase Admin] Service Role Key:", supabaseServiceRoleKey ? "✓ Configurada" : "✗ NO CONFIGURADA");

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[Supabase Admin] Error: Faltan credenciales", {
      url: !!supabaseUrl,
      key: !!supabaseServiceRoleKey,
      env: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }
    });
    throw new Error("Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) o SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log("[Supabase Admin] Cliente creado exitosamente");
  return client;
}
