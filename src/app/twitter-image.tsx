import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt = "WPARSER — Парсер статей Википедии";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(140deg, #0b1220 0%, #111827 45%, #1e293b 100%)",
          color: "white",
          padding: "56px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "999px",
                background: "#22d3ee",
                boxShadow: "0 0 20px rgba(34, 211, 238, 0.85)",
              }}
            />
            <span style={{ fontSize: "30px", fontWeight: 700 }}>WPARSER</span>
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#93c5fd",
              border: "1px solid rgba(147, 197, 253, 0.4)",
              borderRadius: "999px",
              padding: "6px 16px",
            }}
          >
            wikipedia parser
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "68px", lineHeight: 1.04, fontWeight: 800 }}>
            Данные из Wikipedia
            <br />
            в один клик
          </div>
          <div style={{ fontSize: "32px", color: "#cbd5e1" }}>
            article / person / network graph
          </div>
        </div>

        <div style={{ fontSize: "24px", color: "#94a3b8" }}>
          Для проекта «Карт Краеведа»
        </div>
      </div>
    ),
    size,
  );
}
