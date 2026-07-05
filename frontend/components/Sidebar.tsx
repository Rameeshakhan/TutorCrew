"use client";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/api";

const nav = [
  { label: "Overview", items: [
    { href: "/dashboard", icon: "📊", label: "Dashboard" },
  ]},
  { label: "Learn", items: [
    { href: "/upload", icon: "📄", label: "Upload Notes" },
    { href: "/quiz", icon: "🧠", label: "Take a Quiz" },
    { href: "/explain", icon: "💡", label: "AI Explainer" },
  ]},
  { label: "Insights", items: [
    { href: "/gaps", icon: "🔍", label: "Knowledge Gaps" },
    { href: "/schedule", icon: "📅", label: "Study Schedule" },
  ]},
  { label: "Integrations", items: [
    { href: "/integrations", icon: "🔗", label: "Calendar & WhatsApp" },
    // { href: "/agents", icon: "🤖", label: "Agent Pipeline" },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  let user = { name: "Student", username: "user" };
  if (typeof window !== "undefined") {
    try { user = JSON.parse(localStorage.getItem("tc_user") || "{}"); } catch {}
  }

  return (
    <aside style={{
      width: 228, minHeight: "100vh", background: "var(--surface)",
      borderRight: "1px solid var(--border)", display: "flex",
      flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100,
      paddingBottom: 20
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid var(--border)", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg,#6c63ff,#22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 14px rgba(108,99,255,0.4)", flexShrink: 0
          }}>🎓</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>
            Tutor<span style={{ color: "var(--accent2)" }}>Crew</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "0 10px", overflowY: "auto" }}>
        {nav.map(section => (
          <div key={section.label} style={{ marginBottom: 6 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
              color: "var(--muted)", textTransform: "uppercase",
              padding: "10px 8px 4px"
            }}>{section.label}</div>
            {section.items.map(item => {
              const active = pathname === item.href;
              return (
                <div key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "9px 11px", borderRadius: 8, cursor: "pointer",
                    fontSize: 13.5, fontWeight: 500,
                    color: active ? "var(--accent2)" : "var(--muted)",
                    background: active ? "rgba(108,99,255,0.14)" : "transparent",
                    border: `1px solid ${active ? "rgba(108,99,255,0.28)" : "transparent"}`,
                    transition: "all .15s", marginBottom: 2
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--card)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* User card */}
      <div style={{ padding: "12px 10px 0", borderTop: "1px solid var(--border)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: "var(--card)", borderRadius: 9, border: "1px solid var(--border)"
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg,#6c63ff,#22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0
          }}>
            {(user.name || "S")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name || "Student"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Student</div>
          </div>
          <button onClick={logout} title="Sign out" style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--muted)", fontSize: 16, padding: "2px 4px",
            borderRadius: 4, transition: "color .15s"
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--red)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
          >⏏</button>
        </div>
      </div>
    </aside>
  );
}
