import Link from "next/link";
import UploadForm from "@/components/submission/UploadForm";

export default function UploadPage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }} suppressHydrationWarning>
      <header style={{ background: "#0A0A0A", borderBottom: "1px solid #1A1A1A" }} className="sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span style={{ background: "var(--accent)", color: "#fff", fontSize: "11px" }}
              className="font-bold px-2 py-1 rounded-md tracking-wide uppercase">AI Study</span>
            <span className="text-white font-bold text-base tracking-tight">번개장터 AI 스터디</span>
          </Link>
          <Link href="/" style={{ color: "#666" }} className="text-sm font-medium hover:text-white transition-colors">
            ← 목록으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--ink-muted)" }}>Submit Work</span>
          </div>
          <h1 className="font-bold tracking-tight leading-tight"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", color: "var(--ink)" }}>
            결과물 제출
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
            관리자 검토 후 승인되면 메인 페이지에 공개됩니다.
          </p>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}>
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
