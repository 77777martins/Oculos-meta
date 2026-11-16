import { ImageResponse } from "next/og";

/** Imagem de compartilhamento (WhatsApp, redes sociais): marca + proposta, 1200×630. */
export const alt = "Visio Store — óculos inteligentes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 80% 20%, #2547ea 0%, #0b1437 55%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="15" fill="#2547ea" />
            <path d="M15 21.5 L32 49 L49 21.5" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="9" y="14" width="18" height="12" rx="4.5" fill="#1e2e89" stroke="#fff" strokeWidth="2.6" />
            <rect x="37" y="14" width="18" height="12" rx="4.5" fill="#1e2e89" stroke="#fff" strokeWidth="2.6" />
            <path d="M27 18.2 Q32 15.6 37 18.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>
            Visio<span style={{ color: "#93b4fd", fontWeight: 500, marginLeft: 18 }}>Store</span>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 40, color: "#cbd5e1", maxWidth: 900 }}>Óculos inteligentes com compra segura, PIX e entrega rastreada.</div>
      </div>
    ),
    size,
  );
}
