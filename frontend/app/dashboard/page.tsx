"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dashboard(), api.health()])
      .then(([d, h]) => { setData(d); setHealth(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { icon: "🎯", label: "Quizzes Taken", value: data?.total_quizzes ?? 0, color: "#6c63ff", sub: "All time" },
    { icon: "📈", label: "Average Score", value: data?.average_score ? data.average_score + "%" : "—", color: "#22d3ee", sub: data?.average_score >= 70 ? "↑ Good progress" : "Keep going!" },
    { icon: "📚", label: "Docs Uploaded", value: data?.documents_uploaded ?? 0, color: "#10b981", sub: "PDF & text" },
    { icon: "🗺️", label: "Topics Tracked", value: data?.topics_studied ?? 0, color: "#f59e0b", sub: "In ChromaDB" },
  ];

  const gapEntries = data?.gap_analysis ? Object.entries(data.gap_analysis) : [];
  const scoreHistory = data?.score_history || [];

  const radarData = gapEntries.slice(0, 6).map(([topic, d]: any) => ({
    topic: topic.length > 14 ? topic.slice(0, 14) + "…" : topic,
    score: d.score,
    fullMark: 100
  }));

  const getColor = (score: number) => score >= 75 ? "#10b981" : score >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <AppShell>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 420 }}>
          <Loader text="Loading dashboard…" />
        </div>
      ) : (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Welcome back 👋</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            Your AI-powered study companion. All scores persist in ChromaDB across sessions.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
              padding: 20, display: "flex", alignItems: "center", gap: 14,
              transition: "transform .2s, border-color .2s", cursor: "default",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = s.color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12, fontSize: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${s.color}18`, flexShrink: 0
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: s.color, marginTop: 3 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Score History Chart */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📈 Score History</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Performance across your quiz sessions (from ChromaDB)</div>
            {scoreHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={scoreHistory}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232840" />
                  <XAxis dataKey="topic" tick={{ fill: "#6b7db3", fontSize: 10 }}
                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "…" : v} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7db3", fontSize: 11 }}
                    tickFormatter={v => v + "%"} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [v + "%", "Score"]}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6c63ff" strokeWidth={2.5}
                    fill="url(#scoreGrad)" dot={{ fill: "#6c63ff", r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>No quiz data yet</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Take your first quiz to see progress</div>
                <button onClick={() => router.push("/quiz")} style={{
                  marginTop: 14, padding: "8px 18px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
                  border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>Take a Quiz →</button>
              </div>
            )}
          </div>

          {/* Radar chart */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🕸️ Knowledge Radar</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Topic mastery from ChromaDB vector store</div>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#232840" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#6b7db3", fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#6c63ff" fill="#6c63ff" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
                Complete quizzes to populate radar
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Gap bar chart */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🔍 Topic Mastery</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Persisted scores from ChromaDB gap collection</div>
            {gapEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gapEntries.slice(0, 7).map(([t, d]: any) => ({
                  name: t.length > 12 ? t.slice(0, 12) + "…" : t,
                  score: d.score
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232840" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7db3", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7db3", fontSize: 11 }} tickFormatter={v => v + "%"} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [v + "%", "Mastery"]} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {gapEntries.slice(0, 7).map(([, d]: any, i: number) => (
                      <Cell key={i} fill={getColor(d.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
                No gap data yet — take a quiz!
              </div>
            )}
          </div>

          {/* ChromaDB live stats */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🗄️ ChromaDB Live Stats</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>Vector collections in your persistent store</div>
            {[
              { label: "Gap Vectors", val: health?.chroma?.gaps ?? 0, icon: "🔍", color: "#ef4444", desc: "Knowledge gap scores" },
              { label: "Document Chunks", val: health?.chroma?.documents ?? 0, icon: "📄", color: "#6c63ff", desc: "Embedded text chunks" },
              { label: "Quiz History", val: health?.chroma?.history ?? 0, icon: "📋", color: "#10b981", desc: "Session records" },
            ].map(item => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                background: "var(--surface)", borderRadius: 9, border: "1px solid var(--border)",
                marginBottom: 10
              }}>
                <div style={{ fontSize: 22 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          background: "linear-gradient(135deg,rgba(108,99,255,0.1),rgba(34,211,238,0.05))",
          border: "1px solid rgba(108,99,255,0.25)", borderRadius: 14, padding: 22
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>⚡ Quick Start</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "🧠 Take a Quiz", href: "/quiz", primary: true },
              { label: "📄 Upload Notes", href: "/upload" },
              { label: "💡 Explain a Topic", href: "/explain" },
              { label: "🔍 View Gaps", href: "/gaps" },
            ].map(a => (
              <button key={a.href} onClick={() => router.push(a.href)} style={{
                padding: "10px 20px", border: "none", borderRadius: 9, cursor: "pointer",
                fontSize: 14, fontWeight: 600, transition: "all .15s",
                background: a.primary ? "linear-gradient(135deg,#6c63ff,#8b5cf6)" : "var(--card)",
                color: a.primary ? "#fff" : "var(--text)",
                ...(a.primary ? { boxShadow: "0 4px 14px rgba(108,99,255,0.35)" } : { border: "1px solid var(--border2)" })
              }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
    </AppShell>
  );
}
