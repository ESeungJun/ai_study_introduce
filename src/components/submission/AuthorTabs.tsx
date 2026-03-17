"use client";

import { useState } from "react";
import SubmissionCard from "./SubmissionCard";

interface Submission {
  id: string;
  cohort: string;
  authorName: string;
  title: string;
  description?: string;
  screenshots: string[];
  createdAt: string;
}

interface Props {
  cohorts: string[];
  authors: string[];
  submissions: Submission[];
}

export default function AuthorTabs({ cohorts, authors, submissions }: Props) {
  const [activeCohort, setActiveCohort] = useState("전체");
  const [activeAuthor, setActiveAuthor] = useState("전체");

  const cohortFiltered = activeCohort === "전체"
    ? submissions
    : submissions.filter((s) => s.cohort === activeCohort);

  const filtered = activeAuthor === "전체"
    ? cohortFiltered
    : cohortFiltered.filter((s) => s.authorName.toLowerCase() === activeAuthor.toLowerCase());

  // 현재 기수 내 작성자 목록
  const availableAuthors = ["전체", ...Array.from(new Set(cohortFiltered.map((s) => s.authorName)))];

  const handleCohortChange = (cohort: string) => {
    setActiveCohort(cohort);
    setActiveAuthor("전체");
  };

  const tabStyle = (active: boolean) => active
    ? { background: "var(--ink)", color: "#fff" }
    : { background: "var(--surface)", color: "var(--ink-muted)", border: "1px solid var(--border)" };

  return (
    <div>
      {/* 기수 탭 */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-subtle)" }}>기수</p>
        <div className="flex flex-wrap gap-2">
          {cohorts.map((cohort) => (
            <button key={cohort} onClick={() => handleCohortChange(cohort)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
              style={tabStyle(activeCohort === cohort)}>
              {cohort}
              {cohort !== "전체" && (
                <span className="ml-1.5 text-xs opacity-50">
                  {submissions.filter((s) => s.cohort === cohort).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 멤버 탭 */}
      {availableAuthors.length > 2 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ink-subtle)" }}>멤버</p>
          <div className="flex flex-wrap gap-2">
            {availableAuthors.map((author) => (
              <button key={author} onClick={() => setActiveAuthor(author)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
                style={tabStyle(activeAuthor === author)}>
                {author}
                {author !== "전체" && (
                  <span className="ml-1 text-xs opacity-50">
                    {cohortFiltered.filter((s) => s.authorName === author).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 구분선 + 결과 카운트 */}
      <div className="flex items-center justify-between mb-5 pt-1">
        <p className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
          <span className="font-bold" style={{ color: "var(--ink)" }}>{filtered.length}</span>개의 결과물
        </p>
        {activeCohort !== "전체" && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--ink)", color: "#fff" }}>
            {activeCohort}
          </span>
        )}
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
