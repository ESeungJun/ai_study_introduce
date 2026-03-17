"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadProgress {
  pdf: number;
  screenshots: number;
  video: number;
}

export default function UploadForm() {
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ pdf: 0, screenshots: 0, video: 0 });

  const [form, setForm] = useState({
    password: "",
    cohort: "1기",
    authorName: "",
    authorContact: "",
    title: "",
    description: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const onPdfDrop = useCallback((files: File[]) => {
    if (files[0]) setPdfFile(files[0]);
  }, []);

  const onScreenshotDrop = useCallback((files: File[]) => {
    setScreenshotFiles((prev) => [...prev, ...files].slice(0, 10));
  }, []);

  const onVideoDrop = useCallback((files: File[]) => {
    if (files[0]) setVideoFile(files[0]);
  }, []);

  const { getRootProps: getPdfProps, getInputProps: getPdfInput, isDragActive: isPdfDrag } = useDropzone({
    onDrop: onPdfDrop, accept: { "application/pdf": [".pdf"] }, maxFiles: 1, maxSize: 50 * 1024 * 1024,
  });

  const { getRootProps: getScreenshotProps, getInputProps: getScreenshotInput, isDragActive: isScreenshotDrag } = useDropzone({
    onDrop: onScreenshotDrop, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] }, maxFiles: 10,
  });

  const { getRootProps: getVideoProps, getInputProps: getVideoInput, isDragActive: isVideoDrag } = useDropzone({
    onDrop: onVideoDrop, accept: { "video/*": [".mp4", ".mov", ".webm"] }, maxFiles: 1, maxSize: 500 * 1024 * 1024,
  });

  const uploadFile = (file: File, path: string, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed",
        (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!pdfFile) {
      setError("PDF 파일은 필수입니다.");
      return;
    }

    setLoading(true);
    try {
      const tempId = Date.now().toString();

      // PDF 업로드
      const pdfUrl = await uploadFile(
        pdfFile,
        `submissions/${tempId}/pdf/original.pdf`,
        (p) => setProgress((prev) => ({ ...prev, pdf: p }))
      );

      // 스크린샷 업로드
      const screenshots: string[] = [];
      for (let i = 0; i < screenshotFiles.length; i++) {
        const url = await uploadFile(
          screenshotFiles[i],
          `submissions/${tempId}/screenshots/${i}_${screenshotFiles[i].name}`,
          (p) => setProgress((prev) => ({ ...prev, screenshots: p }))
        );
        screenshots.push(url);
      }

      // 영상 업로드 (파일인 경우)
      let videoUrl = null;
      if (videoFile) {
        videoUrl = await uploadFile(
          videoFile,
          `submissions/${tempId}/video/original`,
          (p) => setProgress((prev) => ({ ...prev, video: p }))
        );
      }

      // API 호출
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: form.password,
          cohort: form.cohort,
          authorName: form.authorName,
          authorContact: form.authorContact,
          title: form.title,
          description: form.description,
          pdfUrl,
          screenshots,
          videoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "오류가 발생했습니다.");
        return;
      }

      setStep("success");
    } catch (err) {
      console.error(err);
      setError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400"
  const inputStyle = { border: "1.5px solid var(--border)" }
  const labelClass = "block text-xs font-black tracking-wider uppercase mb-2"
  const labelStyle = { color: "var(--ink-muted)" }

  if (step === "success") {
    return (
      <div className="text-center py-16">
        <div className="font-display text-7xl mb-4" style={{ color: "var(--ink)" }}>✓</div>
        <h2 className="font-black text-2xl mb-2" style={{ color: "var(--ink)" }}>제출 완료!</h2>
        <p className="text-sm mb-8" style={{ color: "var(--ink-muted)" }}>관리자 검토 후 승인되면 메인 페이지에 노출됩니다.</p>
        <button
          onClick={() => { setStep("form"); setForm({ password: "", cohort: "", authorName: "", authorContact: "", title: "", description: "" }); setPdfFile(null); setScreenshotFiles([]); setVideoFile(null); }}
          className="btn-primary px-8 py-3 rounded-full text-sm"
        >
          다시 제출하기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 비밀번호 */}
      <div>
        <label className={labelClass} style={labelStyle}>업로드 비밀번호 <span style={{ color: "#EF4444" }}>*</span></label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="스터디 공용 비밀번호"
            className={`${inputClass} pr-11`} style={inputStyle} required />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 기수 */}
      <div>
        <label className={labelClass} style={labelStyle}>기수 <span style={{ color: "#EF4444" }}>*</span></label>
        <div className="flex flex-wrap gap-2">
          {["1기"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setForm((p) => ({ ...p, cohort: g }))}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={form.cohort === g
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "var(--bg)", color: "var(--ink-muted)", border: "1.5px solid var(--border)" }
              }
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 작성자 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={labelStyle}>이름/닉네임 <span style={{ color: "#EF4444" }}>*</span></label>
          <input type="text" value={form.authorName}
            onChange={(e) => setForm((p) => ({ ...p, authorName: e.target.value }))}
            placeholder="홍길동" className={inputClass} style={inputStyle} required />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>연락처 / 이메일 <span className="normal-case font-medium">(선택)</span></label>
          <input type="text" value={form.authorContact}
            onChange={(e) => setForm((p) => ({ ...p, authorContact: e.target.value }))}
            placeholder="example@email.com" className={inputClass} style={inputStyle} />
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className={labelClass} style={labelStyle}>제목 <span style={{ color: "#EF4444" }}>*</span></label>
        <input type="text" value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="결과물 제목" className={inputClass} style={inputStyle} required />
      </div>

      {/* 설명 */}
      <div>
        <label className={labelClass} style={labelStyle}>설명 <span className="normal-case font-medium">(선택)</span></label>
        <textarea value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="결과물에 대한 간단한 설명" rows={3}
          className={`${inputClass} resize-none`} style={inputStyle} />
      </div>

      {/* PDF */}
      <div>
        <label className={labelClass} style={labelStyle}>PDF <span style={{ color: "#EF4444" }}>*</span> <span className="normal-case font-medium">(최대 50MB)</span></label>
        <div {...getPdfProps()} className="rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isPdfDrag ? "var(--accent-dark)" : pdfFile ? "#22C55E" : "var(--border)"}`,
            background: isPdfDrag ? "#FFFBEB" : pdfFile ? "#F0FDF4" : "var(--bg)",
          }}>
          <input {...getPdfInput()} />
          {pdfFile
            ? <p className="text-sm font-bold" style={{ color: "#16A34A" }}>{pdfFile.name}</p>
            : <p className="text-sm" style={{ color: "var(--ink-subtle)" }}>PDF 파일을 드래그하거나 클릭해서 선택</p>}
        </div>
        {loading && progress.pdf > 0 && progress.pdf < 100 && (
          <div className="mt-2">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full transition-all" style={{ width: `${progress.pdf}%`, background: "var(--ink)" }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>PDF 업로드 중... {progress.pdf}%</p>
          </div>
        )}
      </div>

      {/* 스크린샷 */}
      <div>
        <label className={labelClass} style={labelStyle}>스크린샷 <span className="normal-case font-medium">(선택, 최대 10장)</span></label>
        <div {...getScreenshotProps()} className="rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isScreenshotDrag ? "var(--accent-dark)" : "var(--border)"}`,
            background: isScreenshotDrag ? "#FFFBEB" : "var(--bg)",
          }}>
          <input {...getScreenshotInput()} />
          <p className="text-sm" style={{ color: "var(--ink-subtle)" }}>이미지 파일을 드래그하거나 클릭해서 선택</p>
        </div>
        {screenshotFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {screenshotFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "var(--ink)", color: "#fff" }}>
                <span className="truncate max-w-[140px]">{f.name}</span>
                <button type="button" onClick={() => setScreenshotFiles((p) => p.filter((_, j) => j !== i))}
                  className="ml-1 hover:opacity-70">×</button>
              </div>
            ))}
          </div>
        )}
        {loading && progress.screenshots > 0 && progress.screenshots < 100 && (
          <div className="mt-2">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full transition-all" style={{ width: `${progress.screenshots}%`, background: "var(--ink)" }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>스크린샷 업로드 중... {progress.screenshots}%</p>
          </div>
        )}
      </div>

      {/* 영상 */}
      <div>
        <label className={labelClass} style={labelStyle}>영상 <span className="normal-case font-medium">(선택, mp4/mov/webm)</span></label>
        <div {...getVideoProps()} className="rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isVideoDrag ? "var(--accent-dark)" : videoFile ? "#22C55E" : "var(--border)"}`,
            background: isVideoDrag ? "#FFFBEB" : videoFile ? "#F0FDF4" : "var(--bg)",
          }}>
          <input {...getVideoInput()} />
          {videoFile
            ? <p className="text-sm font-bold" style={{ color: "#16A34A" }}>{videoFile.name}</p>
            : <p className="text-sm" style={{ color: "var(--ink-subtle)" }}>영상 파일을 드래그하거나 클릭해서 선택</p>}
        </div>
        {loading && progress.video > 0 && progress.video < 100 && (
          <div className="mt-2">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full transition-all" style={{ width: `${progress.video}%`, background: "var(--ink)" }} />
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>영상 업로드 중... {progress.video}%</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="btn-primary w-full py-4 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? "업로드 중..." : "제출하기"}
      </button>
    </form>
  );
}
