"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";

export default function IntegrationsPage() {
  const [calTopic, setCalTopic] = useState(""); const [calAreas, setCalAreas] = useState(""); const [calDate, setCalDate] = useState(new Date().toISOString().split("T")[0]);
  const [calResult, setCalResult] = useState<any>(null); const [calLoading, setCalLoading] = useState(false);
  const [waPhone, setWaPhone] = useState(""); const [waTopic, setWaTopic] = useState(""); const [waTime, setWaTime] = useState("");
  const [waResult, setWaResult] = useState<any>(null); const [waLoading, setWaLoading] = useState(false);

  async function scheduleCalendar() {
    if (!calTopic.trim()) return;
    setCalLoading(true);
    try {
      const areas = calAreas ? calAreas.split(",").map(s => s.trim()) : [calTopic];
      const d = await api.scheduleCalendar({ topic: calTopic, weak_areas: areas, start_date: calDate });
      setCalResult(d);
    } catch (e: any) { setCalResult({ error: e.message }); } finally { setCalLoading(false); }
  }

  async function sendWA() {
    if (!waPhone.trim() || !waTopic.trim()) return;
    setWaLoading(true);
    try {
      const d = await api.whatsapp({ phone: waPhone, topic: waTopic, schedule_time: waTime || new Date().toISOString() });
      setWaResult(d);
    } catch (e: any) { setWaResult({ error: e.message }); } finally { setWaLoading(false); }
  }

  const fieldStyle = { width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1.5px solid var(--border2)", borderRadius: 9, color: "var(--text)", fontSize: 14, outline: "none" };
  const labelStyle = { display: "block" as const, fontSize: 13, fontWeight: 600 as const, marginBottom: 6 };
  const fgStyle = { marginBottom: 14 };

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Integrations 🔗</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>Connect TutorCrew to your calendar and messaging apps.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>📅</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Google Calendar</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Auto-schedule spaced repetition</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", fontWeight: 600 }}>MCP Bridge</span>
          </div>
          <div style={fgStyle}><label style={labelStyle}>Topic</label><input value={calTopic} onChange={e => setCalTopic(e.target.value)} placeholder="e.g. Photosynthesis" style={fieldStyle} /></div>
          <div style={fgStyle}><label style={labelStyle}>Weak Areas <span style={{ fontWeight: 400, color: "var(--muted)" }}>(comma-separated)</span></label><input value={calAreas} onChange={e => setCalAreas(e.target.value)} placeholder="e.g. Chloroplasts, Light reactions" style={fieldStyle} /></div>
          <div style={{ ...fgStyle, marginBottom: 20 }}><label style={labelStyle}>Start Date</label><input type="date" value={calDate} onChange={e => setCalDate(e.target.value)} style={fieldStyle} /></div>
          <button onClick={scheduleCalendar} disabled={calLoading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {calLoading ? "⏳ Scheduling…" : "📅 Add to Calendar"}
          </button>
          {calResult && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 9, background: calResult.error ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${calResult.error ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
              {calResult.error ? <div style={{ color: "#f87171", fontSize: 13 }}>❌ {calResult.error}</div> : (
                <>
                  <div style={{ color: "var(--green)", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>✅ {calResult.message}</div>
                  {(calResult.events || []).slice(0, 3).map((e: any, i: number) => <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>📅 {e.date} — {e.title || e.topic}</div>)}
                  {calResult.calendar_link && <a href={calResult.calendar_link} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "var(--accent3)", textDecoration: "none" }}>Open Google Calendar →</a>}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 36 }}>💬</span>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>WhatsApp Reminders</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Study reminders via Twilio</div></div>
            <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(16,185,129,0.1)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.25)", fontWeight: 600 }}>Twilio API</span>
          </div>
          <div style={fgStyle}><label style={labelStyle}>Phone <span style={{ fontWeight: 400, color: "var(--muted)" }}>(with country code)</span></label><input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="+92 300 1234567" style={fieldStyle} /></div>
          <div style={fgStyle}><label style={labelStyle}>Topic</label><input value={waTopic} onChange={e => setWaTopic(e.target.value)} placeholder="e.g. Organic Chemistry" style={fieldStyle} /></div>
          <div style={{ ...fgStyle, marginBottom: 20 }}><label style={labelStyle}>Schedule Time</label><input type="datetime-local" value={waTime} onChange={e => setWaTime(e.target.value)} style={fieldStyle} /></div>
          <button onClick={sendWA} disabled={waLoading} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#6c63ff,#8b5cf6)", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {waLoading ? "⏳ Setting…" : "💬 Set Reminder"}
          </button>
          {waResult && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 9, background: waResult.error ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${waResult.error ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
              {waResult.error ? <div style={{ color: "#f87171", fontSize: 13 }}>❌ {waResult.error}</div> : (
                <>
                  <div style={{ color: "var(--green)", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>✅ Reminder scheduled!</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>📱 To: {waResult.reminder?.to}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>💬 "{waResult.reminder?.message}"</div>
                  {waResult.note && <div style={{ fontSize: 11, color: "var(--yellow)" }}>⚠ {waResult.note}</div>}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🛠️ Tech Stack</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { icon: "🤖", name: "CrewAI 1.x", desc: "Multi-agent orchestration" },
            { icon: "⚡", name: "FastAPI", desc: "Backend API" },
            { icon: "🔮", name: "Claude Sonnet 4.6", desc: "LLM backbone" },
            { icon: "🗄️", name: "ChromaDB", desc: "Vector memory store" },
            { icon: "📄", name: "PyMuPDF", desc: "PDF text extraction" },
            { icon: "📅", name: "Google Calendar", desc: "Spaced scheduling" },
            { icon: "💬", name: "Twilio WhatsApp", desc: "Study reminders" },
            { icon: "🔭", name: "LangSmith", desc: "Agent tracing" },
          ].map(t => (
            <div key={t.name} style={{ padding: "14px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
