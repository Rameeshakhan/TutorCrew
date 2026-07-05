"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";

export default function UploadPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.documents().then(setDocs).catch(() => {}); }, []);

  async function doUpload(file: File) {
    setUploading(true); setResult(null);
    try {
      const data = await api.upload(file);
      setResult(data);
      api.documents().then(setDocs).catch(() => {});
    } catch (e: any) { setResult({ error: e.message }); }
    finally { setUploading(false); }
  }

  return (
    <AppShell>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Upload Notes & PDFs 📄</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>
        PyMuPDF extracts text, chunks it, and stores embeddings in ChromaDB for context-aware quiz generation.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div
            style={{
              background: drag ? "rgba(108,99,255,0.07)" : "var(--card)",
              border: `2px dashed ${drag ? "var(--accent)" : "var(--border2)"}`,
              borderRadius: 14, padding: "48px 24px", textAlign: "center",
              cursor: uploading ? "default" : "pointer", transition: "all .2s"
            }}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) doUpload(f); }}
          >
            <div style={{ fontSize: 52, marginBottom: 12 }}>{uploading ? "⏳" : "📂"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              {uploading ? "Processing with PyMuPDF…" : "Drop file here or click to browse"}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>PDF, TXT, MD — up to 10MB</div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); }} />

          {result && (
            <div style={{
              marginTop: 16, padding: 16, borderRadius: 10,
              background: result.error ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
              border: `1px solid ${result.error ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`
            }}>
              {result.error ? (
                <div style={{ color: "#f87171", fontSize: 13 }}>❌ {result.error}</div>
              ) : (
                <>
                  <div style={{ color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>✅ Uploaded & embedded in ChromaDB!</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{result.chunks} chunks → ChromaDB vector store</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{result.word_count?.toLocaleString()} words extracted via PyMuPDF</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(result.topics || []).map((t: string) => (
                      <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "rgba(108,99,255,0.14)", color: "var(--accent2)", border: "1px solid rgba(108,99,255,0.25)" }}>{t}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, padding: 16, background: "rgba(108,99,255,0.07)", border: "1px solid rgba(108,99,255,0.18)", borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🗄️ How ChromaDB is used here</div>
            {["PyMuPDF extracts full text from PDF", "Text split into 500-word chunks (50-word overlap)", "ChromaDB embeds & stores each chunk with cosine similarity index", "Question Generator queries ChromaDB for relevant chunks at quiz time"].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12, color: "var(--muted)" }}>
                <span style={{ color: "var(--accent2)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {s}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📚 Uploaded Documents</div>
          {docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📁</div>
              <div style={{ fontWeight: 500 }}>No documents yet</div>
            </div>
          ) : docs.map(d => (
            <div key={d.doc_id} style={{ padding: "14px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.filename}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{d.word_count?.toLocaleString()} words · {d.uploaded_at?.slice(0, 10)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(d.topics || []).map((t: string) => (
                  <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "rgba(108,99,255,0.12)", color: "var(--accent2)", border: "1px solid rgba(108,99,255,0.2)" }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
