"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";

export default function ExplainPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function explain() {
    if (!topic.trim()) return;
    setLoading(true);
    try { const d = await api.explain(topic.trim()); setResult(d); }
    catch (e: any) { setResult({ error: e.message }); }
    finally { setLoading(false); }
  }

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>AI Topic Explainer 💡</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>
        Ask any topic. If you've uploaded documents, relevant chunks are retrieved from ChromaDB to ground the explanation.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>What do you want to understand?</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && explain()}
              placeholder="e.g. Quantum entanglement, Krebs cycle, Keynesian economics…"
              style={{ width: "100%", padding: "11px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none" }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--accent)"}
              onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border2)"} />
          </div>
          <button onClick={explain} disabled={loading || !topic.trim()} style={{
            width: "100%", padding: "12px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
            border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", marginBottom: 16
          }}>
            {loading ? "⏳ Explaining…" : "💡 Explain This"}
          </button>
          {result && !result.error && (
            <button onClick={() => router.push(`/quiz?topic=${encodeURIComponent(topic)}`)}
              style={{ width: "100%", padding: "10px", background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
              🧠 Quiz me on this →
            </button>
          )}
          <div style={{ marginTop: 20, padding: 14, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent3)", marginBottom: 6 }}>🗄️ ChromaDB integration</div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65 }}>
              If you've uploaded notes, this queries ChromaDB for relevant chunks using semantic similarity before generating the explanation.
            </div>
          </div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, minHeight: 300 }}>
          {!result && !loading && (
            <div style={{ textAlign: "center", paddingTop: 60, color: "var(--muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
              <div style={{ fontWeight: 500 }}>Enter a topic above</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>AI will explain it with examples, analogies, and key concepts</div>
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
              <div style={{ width: 36, height: 36, border: "3px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Querying ChromaDB & generating explanation…</div>
            </div>
          )}
          {result?.error && <div style={{ color: "#f87171", fontSize: 13 }}>❌ {result.error}</div>}
          {result && !result.error && (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>💡 {result.topic}</div>
              {result.used_docs && <div style={{ fontSize: 11, color: "var(--accent3)", marginBottom: 14 }}>✓ Grounded using your uploaded documents (ChromaDB)</div>}
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", whiteSpace: "pre-wrap" }}>{result.explanation}</div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
