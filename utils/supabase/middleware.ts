import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log("[Supabase Middleware] URL:", supabaseUrl ? "✓ Configurada" : "✗ NO CONFIGURADA");
console.log("[Supabase Middleware] Key:", supabaseKey ? "✓ Configurada" : "✗ NO CONFIGURADA");

export const createClient = (request: NextRequest) => {
  console.log("[Supabase Middleware] Procesando solicitud:", request.nextUrl.pathname);

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase Middleware] Error: Faltan credenciales públicas");
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll();
          console.log("[Supabase Middleware] Cookies obtenidas:", cookies.length);
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log("[Supabase Middleware] Configurando cookies:", cookiesToSet.length);
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  return supabaseResponse
};
