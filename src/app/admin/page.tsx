"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import AdminSubmissionList from "@/components/submission/AdminSubmissionList";

type TabStatus = "pending" | "approved" | "rejected";

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [migrating, setMigrating] = useState(false);
  const [migrateProgress, setMigrateProgress] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken();
        const res = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  const handleMigrateThumbnails = async () => {
    if (!user) return;
    setMigrating(true);
    setMigrateProgress("제출물 목록 조회 중...");

    try {
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/submissions/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { submissions } = await res.json();

      const targets = submissions.filter((s: { pdfThumbnailUrl: string | null }) => !s.pdfThumbnailUrl);
      const total = targets.length;
      let done = 0;
      let failed = 0;

      for (const sub of targets) {
        try {
          // PDF fetch
          const pdfRes = await fetch(`/api/pdf?url=${encodeURIComponent(sub.pdfUrl)}`);
          if (!pdfRes.ok) throw new Error("PDF fetch 실패");
          const pdfData = await pdfRes.arrayBuffer();

          // 썸네일 생성 (동적 import — 브라우저 전용)
          const { generatePdfThumbnail } = await import("@/lib/pdf-thumbnail");
          const blob = await generatePdfThumbnail(pdfData);
          if (!blob) throw new Error("썸네일 생성 실패");

          // Storage 업로드
          const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
          const { storage } = await import("@/lib/firebase");
          const storageRef = ref(storage, `submissions/${sub.id}/pdf/thumbnail.jpg`);
          await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
          const pdfThumbnailUrl = await getDownloadURL(storageRef);

          // Firestore 업데이트
          await fetch(`/api/admin/submissions/${sub.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ pdfThumbnailUrl }),
          });

          done++;
        } catch (err) {
          console.error(`[migration] ${sub.id} 실패:`, err);
          failed++;
        }
        setMigrateProgress(`${done + failed} / ${total} 처리 완료${failed > 0 ? ` (${failed}건 실패)` : ""}`);
      }

      setMigrateProgress(`완료: ${done}건 성공${failed > 0 ? `, ${failed}건 실패` : ""}`);
    } catch (e) {
      console.error(e);
      setMigrateProgress("오류가 발생했습니다.");
    } finally {
      setMigrating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border p-10 text-center max-w-sm w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자 로그인</h1>
          <p className="text-gray-500 text-sm mb-6">Google 계정으로 로그인하세요.</p>
          <Button onClick={handleLogin} size="lg" className="w-full">
            Google로 로그인
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border p-10 text-center max-w-sm w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-500 text-sm mb-2">관리자 계정이 아닙니다.</p>
          <p className="text-gray-500 text-sm mb-2">{user.email}</p>
          <p className="text-xs text-gray-400 mb-6 break-all">UID: {user.uid}</p>
          <Button variant="secondary" onClick={handleSignOut}>로그아웃</Button>
        </div>
      </div>
    );
  }

  const tabs: { label: string; value: TabStatus }[] = [
    { label: "대기 중", value: "pending" },
    { label: "승인됨", value: "approved" },
    { label: "반려됨", value: "rejected" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>로그아웃</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 썸네일 마이그레이션 */}
        <div className="mb-6 p-4 bg-white rounded-xl border flex items-center gap-4">
          <button
            onClick={handleMigrateThumbnails}
            disabled={migrating}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {migrating ? "처리 중..." : "PDF 썸네일 일괄 생성"}
          </button>
          {migrateProgress && (
            <span className="text-sm text-gray-600">{migrateProgress}</span>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AdminSubmissionList status={activeTab} user={user} />
      </main>
    </div>
  );
}
