import { type NextRequest } from "next/server";
import { createClient } from "./utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  console.log("[Middleware] Procesando:", request.method, request.nextUrl.pathname);
  
  try {
    const response = await createClient(request);
    console.log("[Middleware] Respuesta creada exitosamente");
    return response;
  } catch (error) {
    console.error("[Middleware] Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
