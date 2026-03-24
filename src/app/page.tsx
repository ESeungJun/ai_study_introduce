import Link from "next/link";
import { getAdminDb } from "@/lib/firebase-admin";
import AuthorTabs from "@/components/submission/AuthorTabs";

interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;
  createdAt: string;
}

async function getApprovedSubmissions(): Promise<Submission[]> {
  try {
    const snapshot = await getAdminDb()
      .collection("submissions")
      .where("status", "==", "approved")
      .get();
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        authorName: doc.data().authorName,
        title: doc.data().title,
        description: doc.data().description,
        pdfThumbnailUrl: doc.data().pdfThumbnailUrl || null,
        createdAt: doc.data().approvedAt?.toDate().toISOString() || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const submissions = await getApprovedSubmissions();
  const authors = ["전체", ...Array.from(new Set(submissions.map((s) => s.authorName)))];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* 헤더 */}
      <header style={{ background: "#0A0A0A", borderBottom: "1px solid #1A1A1A" }} className="sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span style={{ background: "var(--accent)", color: "#fff", fontSize: "11px" }}
              className="font-bold px-2 py-1 rounded-md tracking-wide uppercase">
              AI Study
            </span>
            <span className="text-white font-bold text-base tracking-tight">번개장터 AI 스터디</span>
          </div>
          <Link href="/upload" className="btn-outline px-4 py-2 rounded-lg text-sm">
            결과물 제출
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section style={{ background: "#0A0A0A" }} className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
              <span className="text-xs font-semibold text-white opacity-50">Bunjang Study Collection</span>
            </div>
            <h1 className="font-bold text-white leading-tight tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", lineHeight: 1.1 }}>
              번개장터 AI 스터디<br />
              <span style={{ color: "#fff", opacity: 0.85 }}>결과물 컬렉션</span>
            </h1>
            <p className="mt-5 leading-relaxed" style={{ color: "#888", fontSize: "1.05rem", maxWidth: "520px" }}>
              AI 스터디를 통해 진행한 3주간의 프로젝트를 확인해보세요.
              각 팀원의 결과물을 PDF, 스크린샷, 시연 영상으로 만나볼 수 있습니다.
            </p>
          </div>

          {/* 통계 */}
          <div className="flex gap-10 mt-14 pt-10" style={{ borderTop: "1px solid #1E1E1E" }}>
            {[
              { value: submissions.length, label: "총 결과물" },
              { value: authors.length - 1, label: "참여 멤버" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-bold text-white" style={{ fontSize: "2.2rem", lineHeight: 1, letterSpacing: "-0.03em" }}>
                  {stat.value}
                </div>
                <div className="text-xs font-medium mt-1.5 uppercase tracking-widest" style={{ color: "#555" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 콘텐츠 */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {submissions.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-6xl mb-5">📂</div>
            <p className="font-semibold text-lg" style={{ color: "var(--ink-secondary)" }}>
              아직 공개된 결과물이 없습니다.
            </p>
            <p className="text-sm mt-2 mb-8" style={{ color: "var(--ink-muted)" }}>
              첫 번째 결과물을 제출해보세요.
            </p>
            <Link href="/upload" className="btn-accent inline-block px-6 py-3 rounded-xl text-sm">
              결과물 제출하기
            </Link>
          </div>
        ) : (
          <AuthorTabs authors={authors} submissions={submissions} />
        )}
      </main>
    </div>
  );
}
