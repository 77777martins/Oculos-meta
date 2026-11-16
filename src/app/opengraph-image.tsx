import { ImageResponse } from "next/og";
import { VISIO_SEAL as S } from "@/components/layout/logo";

/** Imagem de compartilhamento (WhatsApp, redes sociais): selo + wordmark, 1200×630. */
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
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 0%, #1e2e89 0%, #0b1437 60%)",
          color: "white",
        }}
      >
        <svg width="190" height="190" viewBox="0 0 64 64" fill="none" stroke="#fff">
          <circle cx="32" cy="32" r={S.outerRing.r} strokeWidth={S.outerRing.strokeWidth} />
          <circle cx="32" cy="32" r={S.innerRing.r} strokeWidth={S.innerRing.strokeWidth} />
          <path d={S.v} strokeWidth={S.vStrokeWidth} strokeMiterlimit={10} />
          <path d={S.serifs} strokeWidth={S.serifStrokeWidth} />
        </svg>
        <div style={{ display: "flex", marginTop: 44, fontSize: 104, fontWeight: 400, letterSpacing: 34, paddingLeft: 34 }}>VISIO</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 24, letterSpacing: 10, paddingLeft: 10, color: "rgba(255,255,255,0.6)" }}>
          ÓCULOS INTELIGENTES
        </div>
      </div>
    ),
    size,
  );
}
