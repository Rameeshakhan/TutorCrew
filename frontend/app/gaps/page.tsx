"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Loader from "@/components/Loader";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

export default function GapsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api.gaps().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const gaps = data?.gaps || {};
  const entries = Object.entries(gaps) as [string, any][];
  const weak = entries.filter(([,v]) => v.status === "weak").sort((a,b) => a[1].score - b[1].score);
  const avg = entries.filter(([,v]) => v.status === "average");
  const strong = entries.filter(([,v]) => v.status === "strong");
  const getColor = (s: number) => s >= 75 ? "#10b981" : s >= 55 ? "#f59e0b" : "#ef4444";

  const radarData = entries.slice(0, 7).map(([t, d]) => ({
    topic: t.length > 12 ? t.slice(0, 12) + "…" : t,
    score: d.score
  }));

  const barData = entries.sort((a, b) => a[1].score - b[1].score).map(([t, d]) => ({
    name: t.length > 16 ? t.slice(0, 16) + "…" : t,
    score: d.score,
    attempts: d.attempts
  }));

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Knowledge Gap Analysis 🔍</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>
        All scores persist in ChromaDB using exponential moving average (EMA) across sessions. Semantic search clusters related weak topics.
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
          <Loader text="Loading knowledge gaps…" />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--muted)" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Your knowledge map is empty</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Complete quizzes to detect gaps and build your map</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[{ label: "Weak", items: weak, color: "#ef4444", icon: "📉", bg: "rgba(239,68,68,0.08)" },
              { label: "Average", items: avg, color: "#f59e0b", icon: "📊", bg: "rgba(245,158,11,0.07)" },
              { label: "Strong", items: strong, color: "#10b981", icon: "📈", bg: "rgba(16,185,129,0.07)" }
            ].map(({ label, items, color, icon, bg }) => (
              <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{icon} {label}</div>
                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: bg, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>None detected</div>
                ) : items.map(([topic, d]) => (
                  <div key={topic} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{topic}</span>
                      <span style={{ fontSize: 12, color, fontWeight: 700 }}>{d.score}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${d.score}%`, background: color, borderRadius: 3, transition: "width .6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{d.attempts}× attempted · EMA score</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📊 Full Heatmap (sorted by mastery)</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>EMA-weighted scores stored in ChromaDB gap collection</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#232840" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7db3", fontSize: 10 }} tickFormatter={v => v + "%"} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#6b7db3", fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [v + "%", "Score"]} />
                  <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                    {barData.map((d, i) => <Cell key={i} fill={getColor(d.score)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🕸️ Knowledge Radar</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Semantic similarity from ChromaDB vectors</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#232840" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#6b7db3", fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6c63ff" fill="#6c63ff" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>

              {data?.clusters && Object.keys(data.clusters).length > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: "rgba(108,99,255,0.07)", borderRadius: 8, border: "1px solid rgba(108,99,255,0.18)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔗 Semantic Clusters (ChromaDB)</div>
                  {Object.entries(data.clusters).slice(0, 3).map(([weak, related]: any) => (
                    <div key={weak} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                      <span style={{ color: "#f87171" }}>{weak}</span> → related: {(related as string[]).join(", ")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
