import { headers } from "next/headers";

export default async function DiagnosticsPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Configurada" : "✗ NO CONFIGURADA",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "✓ Configurada" : "✗ NO CONFIGURADA",
    SUPABASE_URL: process.env.SUPABASE_URL ? "✓ Configurada" : "✗ NO CONFIGURADA",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ Configurada" : "✗ NO CONFIGURADA",
  };

  const details = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configurada (no mostrada)" : "no configurada",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "configurada (no mostrada)" : "no configurada",
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", backgroundColor: "#1a1a1a", color: "#fff", minHeight: "100vh" }}>
      <h1>🔍 Diagnóstico de Supabase</h1>
      
      <h2>Variables de Entorno</h2>
      <div style={{ backgroundColor: "#2a2a2a", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            <span style={{ color: value.includes("✓") ? "#4ade80" : "#ef4444" }}>
              {value}
            </span>
            {" - "}
            <code>{key}</code>
          </div>
        ))}
      </div>

      <h2>Detalles de Configuración</h2>
      <div style={{ backgroundColor: "#2a2a2a", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <pre style={{ overflow: "auto", fontSize: "0.85rem" }}>
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>

      <h2>Próximos Pasos</h2>
      <ul>
        <li>Asegúrate de que <code>.env</code> o <code>.env.local</code> tenga todas las variables configuradas</li>
        <li>Si ves "✗ NO CONFIGURADA", necesitas agregar esa variable de entorno</li>
        <li>Reinicia el servidor después de cambiar variables de entorno</li>
        <li>Abre la consola del navegador (F12) y el servidor (terminal) para ver más logs</li>
      </ul>

      <hr style={{ borderColor: "#4a4a4a", margin: "2rem 0" }} />

      <h2>Información Útil</h2>
      <div style={{ backgroundColor: "#2a2a2a", padding: "1rem", borderRadius: "8px", color: "#aaa", fontSize: "0.9rem" }}>
        <p>URL base de Supabase: {process.env.NEXT_PUBLIC_SUPABASE_URL || "no configurada"}</p>
        <p>Has completado los pasos siguientes:</p>
        <ol>
          <li>✓ Instalado @supabase/ssr</li>
          <li>✓ Creados clientes de Supabase</li>
          <li>✓ Configurado middleware</li>
          <li>? Agregada Service Role Key (verifica arriba)</li>
        </ol>
      </div>
    </div>
  );
}
