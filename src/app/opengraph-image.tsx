import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt = "WPARSER — Парсер статей Википедии";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 15% 20%, #1d4ed8 0%, #0f172a 35%, #020617 100%)",
          color: "white",
          padding: "56px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "34px",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "999px",
              background: "#60a5fa",
              boxShadow: "0 0 28px rgba(96, 165, 250, 0.85)",
            }}
          />
          WPARSER
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "74px", fontWeight: 800, lineHeight: 1.04 }}>
            Парсер
            <br />
            статей Википедии
          </div>
          <div style={{ fontSize: "34px", color: "#bfdbfe", maxWidth: "920px" }}>
            Структурированный контент + сеть связей для проекта «Карт Краеведа»
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "center",
            fontSize: "28px",
            color: "#cbd5e1",
          }}
        >
          <span>article</span>
          <span>•</span>
          <span>person</span>
          <span>•</span>
          <span>network graph</span>
        </div>
      </div>
    ),
    size,
  );
}
