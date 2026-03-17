"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });
const VideoPlayer = dynamic(() => import("./VideoPlayer"), { ssr: false });

interface Submission {
  id: string;
  authorName: string;
  authorContact?: string;
  title: string;
  description?: string;
  pdfUrl: string;
  screenshots: string[];
  videoUrl?: string;
  createdAt: string;
}

export default function SubmissionDetail({ submission }: { submission: Submission }) {
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);
  const openLightbox = (index: number) => setLightbox({ index });
  const closeLightbox = () => setLightbox(null);
  const prevImage = () => setLightbox((l) => l ? { index: Math.max(0, l.index - 1) } : null);
  const nextImage = () => setLightbox((l) => l ? { index: Math.min(submission.screenshots.length - 1, l.index + 1) } : null);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* 헤더 */}
      <header style={{ background: "#0A0A0A", borderBottom: "1px solid #1A1A1A" }} className="sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span style={{ background: "#fff", color: "var(--ink)", fontSize: "11px" }}
              className="font-bold px-2 py-1 rounded-md tracking-wide uppercase">AI Study</span>
            <span className="text-white font-bold text-base tracking-tight">번개장터 AI 스터디</span>
          </Link>
          <Link href="/" style={{ color: "#666" }} className="text-sm font-medium hover:text-white transition-colors">
            ← 목록으로
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section style={{ background: "#0A0A0A" }} className="pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-2xl font-black tracking-tight" style={{ color: "#fff" }}>
              {submission.authorName}
            </span>
            {submission.authorContact && (
              <span className="text-xs font-medium" style={{ color: "#555" }}>{submission.authorContact}</span>
            )}
            <span style={{ color: "#444" }}>·</span>
            <span className="text-xs" style={{ color: "#555" }}>
              {new Date(submission.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <h1 className="font-bold text-white leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)" }}>
            {submission.title}
          </h1>
          {submission.description && (
            <p className="mt-5 leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: "#888", fontSize: "0.95rem", maxWidth: "640px" }}>
              {submission.description}
            </p>
          )}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* PDF */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>PDF</h2>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="rounded-2xl overflow-hidden p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <PdfViewer url={submission.pdfUrl} />
          </div>
        </section>

        {/* 스크린샷 */}
        {submission.screenshots.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Screenshots</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--ink)", color: "#fff" }}>
                {submission.screenshots.length}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {submission.screenshots.map((url, i) => (
                <button key={i} onClick={() => openLightbox(i)}
                  className="card-hover block rounded-xl overflow-hidden w-full text-left cursor-zoom-in"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <Image src={url} alt={`스크린샷 ${i + 1}`} width={300} height={200}
                    className="w-full object-cover aspect-video" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 영상 */}
        {submission.videoUrl && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>Video</h2>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>
            <div className="rounded-2xl overflow-hidden p-4"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
              <VideoPlayer url={submission.videoUrl} />
            </div>
          </section>
        )}
      </main>

      {/* 라이트박스 */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.94)" }} onClick={closeLightbox}>
          <button onClick={closeLightbox}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full text-white font-bold hover:opacity-60 transition-opacity"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            ×
          </button>
          {lightbox.index > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-5 w-11 h-11 flex items-center justify-center rounded-full text-white transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.12)" }}>←</button>
          )}
          <div className="max-w-[88vw] max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={submission.screenshots[lightbox.index]}
              alt={`스크린샷 ${lightbox.index + 1}`} width={1200} height={800}
              className="max-w-[88vw] max-h-[88vh] object-contain rounded-2xl" />
            <p className="text-center text-xs mt-3 font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
              {lightbox.index + 1} / {submission.screenshots.length}
            </p>
          </div>
          {lightbox.index < submission.screenshots.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-5 w-11 h-11 flex items-center justify-center rounded-full text-white transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.12)" }}>→</button>
          )}
        </div>
      )}
    </div>
  );
}
