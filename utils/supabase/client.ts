import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("[Supabase Client] URL:", supabaseUrl ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("[Supabase Client] Key:", supabaseKey ? "✓ Configurada" : "✗ NO CONFIGURADA");

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Client] Error: Faltan credenciales públicas");
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  console.log("[Supabase Client] Creando cliente browser");
  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
};
