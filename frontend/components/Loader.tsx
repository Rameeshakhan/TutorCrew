"use client";
import React from "react";

export default function Loader({ size = 48, text = "Loading..." }: { size?: number; text?: string }) {
  const spinnerStyle: React.CSSProperties = {
    width: size,
    height: size,
    border: "4px solid rgba(255,255,255,0.08)",
    borderTop: "4px solid var(--accent2)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={spinnerStyle} />
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{text}</div>

      <style>{`\n        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n      `}</style>
    </div>
  );
}
