const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tc_token");
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  me: () => req("/api/auth/me"),
  health: () => req("/api/health"),
  dashboard: () => req("/api/dashboard"),
  gaps: () => req("/api/gaps"),
  documents: () => req("/api/documents"),

  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const token = getToken();
    return fetch(BASE + "/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(r => r.json());
  },

  generateQuiz: (body: object) =>
    req("/api/generate-quiz", { method: "POST", body: JSON.stringify(body) }),

  submitAnswers: (body: object) =>
    req("/api/submit-answers", { method: "POST", body: JSON.stringify(body) }),

  explain: (topic: string) =>
    req("/api/explain", { method: "POST", body: JSON.stringify({ topic }) }),

  scheduleCalendar: (body: object) =>
    req("/api/schedule-calendar", { method: "POST", body: JSON.stringify(body) }),

  whatsapp: (body: object) =>
    req("/api/whatsapp-reminder", { method: "POST", body: JSON.stringify(body) }),
};

export function logout() {
  localStorage.removeItem("tc_token");
  window.location.href = "/login";
}
