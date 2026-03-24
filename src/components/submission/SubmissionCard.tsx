import Link from "next/link";
import Image from "next/image";

interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;
  createdAt: string;
}

export default function SubmissionCard({ submission }: { submission: Submission }) {
  return (
    <Link
      href={`/submission/${submission.id}`}
      className="card-hover group block rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--border)" }}
    >
      {/* 썸네일 */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9", background: "#F3F4F6" }}>
        {submission.pdfThumbnailUrl ? (
          <Image src={submission.pdfThumbnailUrl} alt={submission.title} fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium" style={{ color: "#CBD5E1" }}>PDF</span>
          </div>
        )}
        {/* 뱃지 */}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {submission.authorName}
          </span>
        </div>
      </div>

      {/* 내용 */}
      <div className="p-5">
        <h3 className="font-bold text-base leading-snug line-clamp-2 tracking-tight"
          style={{ color: "var(--ink-secondary)" }}>
          {submission.title}
        </h3>
        {submission.description && (
          <p className="text-sm mt-2 line-clamp-2 leading-relaxed break-words" style={{ color: "var(--ink-muted)" }}>
            {submission.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-4 pt-3.5" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--ink-subtle)" }}>
            {new Date(submission.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
          </span>
          <span className="text-xs font-semibold transition-colors group-hover:opacity-70"
            style={{ color: "var(--ink-muted)" }}>
            자세히 보기 →
          </span>
        </div>
      </div>
    </Link>
  );
}
