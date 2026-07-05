"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ebData = [
  { day: "Now", without: 100, with: 100 },
  { day: "Day 1", without: 80, with: 92 },
  { day: "Day 3", without: 65, with: 88 },
  { day: "Day 7", without: 45, with: 91 },
  { day: "Day 14", without: 28, with: 87 },
  { day: "Day 30", without: 15, with: 93 },
];

export default function SchedulePage() {
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [calLink, setCalLink] = useState("");

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const d = await api.scheduleCalendar({ topic: topic.trim(), weak_areas: [topic.trim()], start_date: date });
      setSchedule(d.events || []);
      setCalLink(d.calendar_link || "");
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  const priorityColor: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#6c63ff", low: "#10b981", maintenance: "#22d3ee" };

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Study Schedule 📅</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>
        Scheduler Agent uses Ebbinghaus forgetting curve intervals: 1 → 3 → 7 → 14 → 30 days. Connects to Google Calendar via MCP bridge.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚙️ Generate Study Plan</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Organic Chemistry"
              style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 14, outline: "none" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Start Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 14, outline: "none" }} />
          </div>
          <button onClick={generate} disabled={loading || !topic.trim()} style={{
            width: "100%", padding: "12px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)",
            border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
          }}>
            {loading ? "⏳ Scheduling…" : "📅 Generate Plan"}
          </button>
          {calLink && (
            <a href={calLink} target="_blank" rel="noopener" style={{ display: "block", marginTop: 12, padding: "10px", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 9, color: "var(--accent3)", fontSize: 13, textAlign: "center", textDecoration: "none", fontWeight: 600 }}>
              📅 Open in Google Calendar →
            </a>
          )}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🧠 Ebbinghaus Forgetting Curve</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Without reviews, you forget 85% in 30 days. TutorCrew's spaced repetition keeps retention above 90%.</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ebData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232840" />
              <XAxis dataKey="day" tick={{ fill: "#6b7db3", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7db3", fontSize: 11 }} tickFormatter={v => v + "%"} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [v + "%"]} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
              <Line type="monotone" dataKey="without" name="Without review" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="with" name="With TutorCrew" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {schedule.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 Scheduled Sessions ({schedule.length})</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {schedule.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--surface)", borderRadius: 9, border: "1px solid var(--border)" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: priorityColor[s.priority] || "#6c63ff", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title || s.topic}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.date} · {s.time || "09:00"} · {s.duration || "30 mins"}</div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${priorityColor[s.priority] || "#6c63ff"}18`, color: priorityColor[s.priority] || "#6c63ff", border: `1px solid ${priorityColor[s.priority] || "#6c63ff"}33`, fontWeight: 600 }}>
                  {s.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
