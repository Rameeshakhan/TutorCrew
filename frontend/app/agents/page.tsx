"use client";
import AppShell from "@/components/AppShell";

const agents = [
  { icon: "🎯", name: "Orchestrator", color: "#6c63ff", tools: ["Task routing", "Context injection"], desc: "Routes all requests through the CrewAI pipeline. Decides whether to pull from ChromaDB document context or general knowledge. Manages sequential task chaining.", role: "Process.sequential controller" },
  { icon: "❓", name: "Question Generator", color: "#a78bfa", tools: ["ChromaDB query", "Claude Sonnet 4.6", "PyMuPDF"], desc: "Queries ChromaDB doc_collection for relevant text chunks using cosine similarity. Generates MCQ questions with distractors grounded in your uploaded material.", role: "Agent 1" },
  { icon: "⚖️", name: "Evaluator", color: "#22d3ee", tools: ["Per-question feedback", "Subtopic scoring"], desc: "Scores submitted answers. Computes per-subtopic accuracy breakdowns that feed into the Gap Detector. Provides detailed explanations for each question.", role: "Agent 2" },
  { icon: "🔍", name: "Gap Detector", color: "#f59e0b", tools: ["ChromaDB read/write", "EMA scoring", "Semantic search"], desc: "The key ChromaDB user. Reads existing topic scores, applies EMA (old×0.6 + new×0.4), writes updated vectors back. Also runs semantic similarity search to surface related weak areas.", role: "Agent 3" },
  { icon: "📅", name: "Scheduler", color: "#10b981", tools: ["Ebbinghaus curve", "Calendar MCP", "Interval logic"], desc: "Applies 1→3→7→14→30 day Ebbinghaus forgetting curve intervals. Creates a study schedule for weak areas. Bridges to Google Calendar via MCP.", role: "Agent 4" },
  { icon: "📊", name: "Reporter", color: "#ef4444", tools: ["Claude Sonnet 4.6", "LangSmith traced"], desc: "Generates an encouraging, specific performance report incorporating gap analysis and scheduled review dates. Output appears on the results screen.", role: "Agent 5" },
];

export default function AgentsPage() {
  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Agent Pipeline 🤖</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>CrewAI multi-agent architecture. Each agent has a single, defensible responsibility.</div>

      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", overflowX: "auto" }}>
        {agents.map((a, i) => (
          <>
            <div key={a.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", border: `2px solid ${a.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: `${a.color}18`, boxShadow: `0 0 16px ${a.color}30` }}>{a.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: a.color, textAlign: "center", maxWidth: 70 }}>{a.name}</div>
            </div>
            {i < agents.length - 1 && <div key={`arrow-${i}`} style={{ fontSize: 20, color: "var(--border2)", margin: "0 6px", paddingBottom: 18 }}>→</div>}
          </>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {agents.map(a => (
          <div key={a.name} style={{ background: "var(--card)", border: "1px solid var(--border)", borderLeft: `3px solid ${a.color}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: a.color, fontWeight: 600 }}>{a.role}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, marginBottom: 12 }}>{a.desc}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {a.tools.map(t => <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}30` }}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, background: "rgba(108,99,255,0.07)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🗄️ ChromaDB Collections</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { name: "knowledge_gaps", desc: "Topic scores with EMA. Updated by Gap Detector after every quiz. Supports semantic similarity search.", color: "#ef4444" },
            { name: "documents", desc: "Embedded text chunks from uploaded PDFs. Queried by Question Generator using cosine similarity.", color: "#6c63ff" },
            { name: "quiz_history", desc: "Session records (topic, score, date). Queried by dashboard for score history charts.", color: "#10b981" },
          ].map(c => (
            <div key={c.name} style={{ padding: 14, background: "var(--card)", borderRadius: 9, border: `1px solid ${c.color}30` }}>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: c.color, fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
