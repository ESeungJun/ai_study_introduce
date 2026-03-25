"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface Submission {
  id: string;
  authorName: string;
  authorContact?: string;
  title: string;
  description?: string;
  pdfUrl: string;
  pdfThumbnailUrl?: string;
  screenshots: string[];
  videoUrl?: string;
  status: string;
  createdAt: string;
}

interface Props {
  status: string;
  user: User;
}

export default function AdminSubmissionList({ status, user }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/submissions?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } finally {
      setLoading(false);
    }
  }, [status, user]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleAction = async (id: string, newStatus: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerateThumbnail = async (sub: Submission) => {
    setThumbnailLoading(sub.id);
    try {
      const token = await user.getIdToken();
      const pdfRes = await fetch(`/api/pdf?url=${encodeURIComponent(sub.pdfUrl)}`);
      if (!pdfRes.ok) throw new Error("PDF fetch 실패");
      const pdfData = await pdfRes.arrayBuffer();

      const { generatePdfThumbnail } = await import("@/lib/pdf-thumbnail");
      const blob = await generatePdfThumbnail(pdfData);
      if (!blob) throw new Error("썸네일 생성 실패");

      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { storage } = await import("@/lib/firebase");
      const storageRef = ref(storage, `submissions/${sub.id}/pdf/thumbnail.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const pdfThumbnailUrl = await getDownloadURL(storageRef);

      await fetch(`/api/admin/submissions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pdfThumbnailUrl }),
      });

      alert("썸네일이 재생성되었습니다.");
    } catch (err) {
      console.error(err);
      alert("썸네일 재생성에 실패했습니다.");
    } finally {
      setThumbnailLoading(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 게시글을 삭제하시겠습니까?\n\n첨부 파일도 함께 삭제되며 복구할 수 없습니다.`)) return;
    setActionLoading(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((s) => (
        <div key={s.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div className="p-5 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900 truncate">{s.title}</span>
              </div>
              <div className="text-sm text-gray-500">
                {s.authorName}
                {s.authorContact && <span className="ml-2 text-gray-400">· {s.authorContact}</span>}
                <span className="ml-2 text-gray-400">· {new Date(s.createdAt).toLocaleDateString("ko-KR")}</span>
              </div>
              {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 shrink-0">
              {status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction(s.id, "approved")}
                    loading={actionLoading === s.id}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleAction(s.id, "rejected")}
                    loading={actionLoading === s.id}
                  >
                    반려
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRegenerateThumbnail(s)}
                loading={thumbnailLoading === s.id}
                disabled={!!actionLoading}
                className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
              >
                썸네일 재생성
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(s.id, s.title)}
                loading={actionLoading === s.id}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                삭제
              </Button>
            </div>
          </div>

          {/* 미리보기 토글 */}
          <div className="border-t px-5 py-3">
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="text-sm text-blue-600 hover:underline"
            >
              {expanded === s.id ? "미리보기 닫기" : "미리보기 열기"}
            </button>
          </div>

          {/* 미리보기 내용 */}
          {expanded === s.id && (
            <div className="border-t p-5 space-y-4 bg-gray-50">
              {/* PDF */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">PDF</p>
                <a
                  href={s.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  새 탭에서 PDF 열기 →
                </a>
              </div>

              {/* 스크린샷 */}
              {s.screenshots.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">스크린샷 ({s.screenshots.length}장)</p>
                  <div className="flex flex-wrap gap-2">
                    {s.screenshots.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={url}
                          alt={`screenshot-${i}`}
                          width={120}
                          height={80}
                          className="rounded border object-cover hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 영상 */}
              {s.videoUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">영상</p>
                  <a
                    href={s.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    영상 링크 열기 →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
