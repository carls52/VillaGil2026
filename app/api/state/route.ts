import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

const STATE_ID = "villagil-fest-2026";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[API GET /state] Iniciando lectura de estado");
    const supabase = getSupabaseAdmin();
    console.log("[API GET /state] Cliente Supabase creado");

    const { data, error } = await supabase
      .from("app_state")
      .select("state")
      .eq("id", STATE_ID)
      .maybeSingle();

    if (error) {
      console.error("[API GET /state] Error de Supabase:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details
      });
      return NextResponse.json(
        { error: `Supabase Error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("[API GET /state] Datos obtenidos:", !!data);
    return NextResponse.json({ state: data?.state ?? null });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error inesperado";
    console.error("[API GET /state] Error capturado:", {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Excepción: ${errorMsg}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log("[API PUT /state] Iniciando escritura de estado");
    const body = await request.json();
    const state = body?.state;

    console.log("[API PUT /state] Body recibido, estado presente:", !!state);

    if (!state || typeof state !== "object") {
      console.error("[API PUT /state] Estado inválido:", typeof state);
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    console.log("[API PUT /state] Cliente Supabase creado");

    const payload = {
      id: STATE_ID,
      state,
      updated_at: new Date().toISOString()
    };
    console.log("[API PUT /state] Enviando payload:", {
      id: payload.id,
      stateKeys: Object.keys(state),
      updated_at: payload.updated_at
    });

    const { error } = await supabase.from("app_state").upsert(payload);

    if (error) {
      console.error("[API PUT /state] Error de Supabase:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details
      });
      return NextResponse.json(
        { error: `Supabase Error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("[API PUT /state] Estado guardado exitosamente");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error inesperado";
    console.error("[API PUT /state] Error capturado:", {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: `Excepción: ${errorMsg}` },
      { status: 500 }
    );
  }
}
