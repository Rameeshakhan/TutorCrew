"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await api.login(username, password);
      localStorage.setItem("tc_token", data.token);
      localStorage.setItem("tc_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", position: "relative", overflow: "hidden"
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, #6c63ff, #22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
            boxShadow: "0 0 32px rgba(108,99,255,0.4)"
          }}>🎓</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
            Tutor<span style={{ color: "var(--accent2)" }}>Crew</span>
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
            AI-Powered Exam Tutor & Weak Area Detector
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 36, boxShadow: "0 8px 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
            Sign in to continue your study session
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "var(--surface)", border: "1.5px solid var(--border2)",
                  borderRadius: 10, color: "var(--text)", fontSize: 14,
                  outline: "none", transition: "border-color .15s"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "11px 14px",
                  background: "var(--surface)", border: "1.5px solid var(--border2)",
                  borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none"
                }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171", fontSize: 13, marginBottom: 16
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px",
              background: loading ? "var(--border2)" : "linear-gradient(135deg,#6c63ff,#8b5cf6)",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 16px rgba(108,99,255,0.4)",
              transition: "all .2s"
            }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <div style={{
            marginTop: 24, padding: "14px 16px",
            background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.2)",
            borderRadius: 10
          }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
              Demo credentials (set in .env)
            </div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "var(--accent2)" }}>Username:</span>{" "}
              <code style={{ color: "var(--text)" }}>ahmed</code>
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <span style={{ color: "var(--accent2)" }}>Password:</span>{" "}
              <code style={{ color: "var(--text)" }}>tutorcrew123</code>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 24 }}>
          Powered by CrewAI · Claude Sonnet 4.6 · ChromaDB
        </div>
      </div>
    </div>
  );
}
