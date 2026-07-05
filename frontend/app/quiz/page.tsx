"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

type Step = "setup" | "active" | "results";

export default function QuizPage() {
  const [step, setStep] = useState<Step>("setup");
  const [docs, setDocs] = useState<any[]>([]);
  const [topic, setTopic] = useState("");
  const [docId, setDocId] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any>(null);
  const [agentStep, setAgentStep] = useState(0);
  const router = useRouter();

  useEffect(() => { api.documents().then(setDocs).catch(() => {}); }, []);

  async function startQuiz() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const data = await api.generateQuiz({ topic: topic.trim(), difficulty, num_questions: numQ, doc_id: docId || null });
      setSession(data);
      setAnswers({});
      setStep("active");
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function submitQuiz() {
    if (Object.keys(answers).length < session.questions.length) {
      alert("Please answer all questions first"); return;
    }
    setLoading(true); setAgentStep(0);
    const tick = setInterval(() => setAgentStep(p => Math.min(p + 1, 4)), 900);
    try {
      const data = await api.submitAnswers({ session_id: session.session_id, answers });
      clearInterval(tick); setAgentStep(5);
      setResults(data);
      setStep("results");
    } catch (e: any) { clearInterval(tick); alert(e.message); }
    finally { setLoading(false); }
  }

  const agents = ["❓ Evaluator", "🔍 Gap Detector", "🗄️ ChromaDB write", "📅 Scheduler", "📊 Reporter"];

  if (step === "setup") return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Take a Quiz 🧠</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>Question Generator Agent creates adaptive MCQs. If you select a document, it queries ChromaDB for relevant context first.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Configure Quiz</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && startQuiz()}
              placeholder="e.g. Photosynthesis, Newton's Laws, World War II…"
              style={{ width: "100%", padding: "11px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none" }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--accent)"}
              onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border2)"} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Source Document <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — queries ChromaDB)</span></label>
            <select value={docId} onChange={e => setDocId(e.target.value)}
              style={{ width: "100%", padding: "11px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none", cursor: "pointer" }}>
              <option value="">— Use general knowledge —</option>
              {docs.map(d => <option key={d.doc_id} value={d.doc_id}>{d.filename}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none" }}>
                <option value="easy">Easy</option>
                <option value="mixed">Mixed</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Questions</label>
              <select value={numQ} onChange={e => setNumQ(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none" }}>
                <option value={3}>3 questions</option>
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
              </select>
            </div>
          </div>
          <button onClick={startQuiz} disabled={loading || !topic.trim()} style={{
            width: "100%", padding: "14px", background: loading ? "var(--border2)" : "linear-gradient(135deg,#6c63ff,#8b5cf6)",
            border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: loading || !topic.trim() ? "not-allowed" : "pointer",
            boxShadow: "0 4px 16px rgba(108,99,255,0.4)"
          }}>
            {loading ? "⏳ Generating questions…" : "🚀 Generate Quiz"}
          </button>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🤖 CrewAI Pipeline</div>
          {["🎯 Orchestrator", "❓ Question Generator", "⚖️ Evaluator", "🔍 Gap Detector + ChromaDB", "📅 Scheduler", "📊 Reporter"].map((a, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{a.split(" ")[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.split(" ").slice(1).join(" ")}</div>
                {i < arr.length - 1 && <div style={{ width: 2, height: 8, background: "var(--border2)", marginLeft: 17, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );

  if (step === "active") return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Quiz: {session.topic}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{session.total} questions · Select the best answer for each</div>
        </div>
        <button onClick={() => setStep("setup")} style={{ padding: "8px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#f87171", fontSize: 13, cursor: "pointer" }}>✕ Exit</button>
      </div>

      {session.questions.map((q: any, i: number) => (
        <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent2)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
            Question {i + 1} · {q.subtopic}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>{q.question}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(q.options).map(([key, val]) => {
              const sel = answers[String(i)] === key;
              return (
                <div key={key} onClick={() => setAnswers(a => ({ ...a, [String(i)]: key }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 15px",
                    background: sel ? "rgba(108,99,255,0.14)" : "var(--surface)",
                    border: `1.5px solid ${sel ? "var(--accent)" : "var(--border2)"}`,
                    borderRadius: 9, cursor: "pointer", transition: "all .15s"
                  }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: sel ? "var(--accent)" : "var(--card)", border: `1px solid ${sel ? "var(--accent)" : "var(--border2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, color: sel ? "#fff" : "var(--text)" }}>{key}</div>
                  <div style={{ fontSize: 14 }}>{val as string}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {loading && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🤖 CrewAI pipeline running…</div>
          {agents.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, opacity: agentStep > i ? 1 : 0.3, transition: "opacity .4s" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: agentStep > i ? "var(--green)" : "var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{agentStep > i ? "✓" : (i + 1)}</div>
              <div style={{ fontSize: 13, color: agentStep > i ? "var(--green)" : "var(--muted)" }}>{a}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{Object.keys(answers).length} of {session.questions.length} answered</div>
        <button onClick={submitQuiz} disabled={loading} style={{
          padding: "12px 28px", background: loading ? "var(--border2)" : "linear-gradient(135deg,#6c63ff,#8b5cf6)",
          border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(108,99,255,0.4)"
        }}>
          {loading ? "⏳ Running agents…" : "✅ Submit Answers"}
        </button>
      </div>
    </AppShell>
  );

  // Results
  const score = results?.evaluation?.score ?? 0;
  const getColor = (s: number) => s >= 75 ? "#10b981" : s >= 55 ? "#f59e0b" : "#ef4444";
  const subtopicData = Object.entries(results?.evaluation?.subtopic_scores || {}).map(([k, v]: any) => ({
    name: k.length > 14 ? k.slice(0, 14) + "…" : k,
    score: Math.round(v.correct / v.total * 100)
  }));

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Quiz Results 🎉</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>Full CrewAI pipeline completed · Gaps written to ChromaDB</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>{score >= 80 ? "🏆" : score >= 60 ? "👍" : "📚"}</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: getColor(score) }}>{score}%</div>
          <div style={{ fontSize: 16, color: "var(--muted)", marginBottom: 16 }}>{results?.evaluation?.correct}/{results?.evaluation?.total} correct</div>
          <div style={{ padding: "6px 16px", borderRadius: 20, display: "inline-block", fontSize: 13, fontWeight: 700,
            background: score >= 80 ? "rgba(16,185,129,0.12)" : score >= 60 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)",
            color: getColor(score), border: `1px solid ${getColor(score)}44` }}>
            {score >= 80 ? "Excellent!" : score >= 60 ? "Good job!" : "Needs work"}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, lineHeight: 1.75, color: "var(--muted)", textAlign: "left" }}>
            {results?.report}
          </div>
        </div>

        <div>
          {subtopicData.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Subtopic Breakdown</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={subtopicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232840" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7db3", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7db3", fontSize: 10 }} tickFormatter={v => v + "%"} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [v + "%", "Score"]} />
                  <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                    {subtopicData.map((d, i) => <Cell key={i} fill={getColor(d.score)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🔍 Weak Areas → ChromaDB</div>
              {(results?.gap_analysis?.weak_areas || []).length > 0
                ? (results.gap_analysis.weak_areas).map((g: string) => (
                    <div key={g} style={{ fontSize: 12, padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#f87171", marginBottom: 6 }}>⚠ {g}</div>
                  ))
                : <div style={{ fontSize: 12, color: "var(--green)" }}>✅ No gaps detected!</div>
              }
            </div>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📅 Scheduled Reviews</div>
              {(results?.study_schedule || []).slice(0, 4).map((s: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                  <span style={{ color: "var(--accent2)", fontWeight: 600 }}>{s.review_date}</span> · {s.topic}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 Question Review</div>
        {(results?.evaluation?.results || []).map((r: any, i: number) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
                background: r.is_correct ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: r.is_correct ? "var(--green)" : "var(--red)", border: `1px solid ${r.is_correct ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}` }}>
                {r.is_correct ? "✓ Correct" : "✗ Wrong"}
              </span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(108,99,255,0.1)", color: "var(--accent2)", border: "1px solid rgba(108,99,255,0.2)" }}>{r.subtopic}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{r.question}</div>
            {!r.is_correct && <div style={{ fontSize: 13, color: "#f87171", marginBottom: 4 }}>Your answer: {r.your_answer} — {r.options?.[r.your_answer] || ""}</div>}
            {!r.is_correct && <div style={{ fontSize: 13, color: "var(--green)", marginBottom: 6 }}>Correct: {r.correct_answer} — {r.correct_option_text}</div>}
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{r.explanation}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => { setStep("setup"); setSession(null); setResults(null); }} style={{ padding: "11px 22px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🔄 New Quiz</button>
        <button onClick={() => router.push("/gaps")} style={{ padding: "11px 22px", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 14, cursor: "pointer" }}>🔍 View Gaps</button>
        <button onClick={() => router.push("/schedule")} style={{ padding: "11px 22px", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 14, cursor: "pointer" }}>📅 Study Plan</button>
      </div>
    </AppShell>
  );
}
