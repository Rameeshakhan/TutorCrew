"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tc_token");
    if (!token) { router.push("/login"); return; }
    setReady(true);
  }, [pathname]);

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Loading TutorCrew…</div>
      </div>
    </div>
  );

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard", "/upload": "Upload Notes", "/quiz": "Take a Quiz",
    "/explain": "AI Explainer", "/gaps": "Knowledge Gaps", "/schedule": "Study Schedule",
    "/integrations": "Integrations", "/agents": "Agent Pipeline"
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ marginLeft: 228, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <div style={{
          height: 58, background: "var(--surface)", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", padding: "0 28px", gap: 14,
          position: "sticky", top: 0, zIndex: 50
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{titles[pathname] || "TutorCrew"}</div>
          <div style={{
            background: "rgba(108,99,255,0.12)", color: "var(--accent2)",
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            border: "1px solid rgba(108,99,255,0.22)"
          }}>CrewAI · ChromaDB · Claude Sonnet 4.6</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12,
            color: "var(--green)", background: "rgba(16,185,129,0.08)",
            padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(16,185,129,0.18)"
          }}>
            <div style={{ width: 7, height: 7, background: "var(--green)", borderRadius: "50%",
              animation: "pulse-dot 2s infinite" }} />
            5 Agents Online
          </div>
        </div>
        <main style={{ padding: 28, flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
