"use client";

/** Último recurso: erro no layout raiz. Sem dependências para não falhar novamente. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, textAlign: "center", padding: 16 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Serviço temporariamente indisponível</h1>
          <p style={{ color: "#475569" }}>Estamos trabalhando para resolver. Tente novamente em instantes.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#2547ea", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
