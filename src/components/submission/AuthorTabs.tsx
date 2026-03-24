"use client";

import { useState } from "react";
import SubmissionCard from "./SubmissionCard";

interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;
  createdAt: string;
}

interface Props {
  authors: string[];
  submissions: Submission[];
}

export default function AuthorTabs({ authors, submissions }: Props) {
  const [activeAuthor, setActiveAuthor] = useState("전체");

  const filtered = activeAuthor === "전체"
    ? submissions
    : submissions.filter((s) => s.authorName.toLowerCase() === activeAuthor.toLowerCase());

  const tabStyle = (active: boolean) => active
    ? { background: "var(--ink)", color: "#fff" }
    : { background: "var(--surface)", color: "var(--ink-muted)", border: "1px solid var(--border)" };

  return (
    <div>
      {/* 멤버 탭 */}
      {authors.length > 2 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-subtle)" }}>멤버</p>
          <div className="flex flex-wrap gap-2">
            {authors.map((author) => (
              <button key={author} onClick={() => setActiveAuthor(author)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
                style={tabStyle(activeAuthor === author)}>
                {author}
                {author !== "전체" && (
                  <span className="ml-1 text-xs opacity-50">
                    {submissions.filter((s) => s.authorName === author).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결과 카운트 */}
      <div className="flex items-center justify-between mb-5 pt-1">
        <p className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
          <span className="font-bold" style={{ color: "var(--ink)" }}>{filtered.length}</span>개의 결과물
        </p>
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <p className="text-center py-20" style={{ color: "var(--ink-subtle)" }}>결과물이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => <SubmissionCard key={s.id} submission={s} />)}
        </div>
      )}
    </div>
  );
}
