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
