# PDF 썸네일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 페이지 카드 썸네일을 항상 PDF 1페이지 이미지(`pdfThumbnailUrl`)로 표시하고, 기존 제출물은 어드민에서 일괄 마이그레이션한다.

**Architecture:** 업로드 시 클라이언트에서 `pdfjs-dist`로 PDF 1페이지를 JPEG blob으로 렌더링해 Firebase Storage에 저장하고 `pdfThumbnailUrl` 필드를 Firestore에 기록한다. 기존 제출물은 어드민 페이지의 "일괄 생성" 버튼으로 처리한다. 썸네일 유틸은 브라우저 전용(`src/lib/pdf-thumbnail.ts`)으로 격리한다.

**Tech Stack:** Next.js 15 (App Router), Firebase Firestore & Storage, pdfjs-dist v5.5.207, TypeScript

---

## File Map

| 파일 | 역할 |
|------|------|
| `src/types/submission.ts` | `pdfThumbnailUrl?: string` 필드 추가 |
| `src/lib/pdf-thumbnail.ts` | 신규: 브라우저 전용 PDF → JPEG 유틸 |
| `next.config.ts` | webpack canvas alias 추가 |
| `src/app/api/submissions/route.ts` | POST에서 `pdfThumbnailUrl` 저장 |
| `src/app/api/admin/submissions/all/route.ts` | 신규: 상태 필터 없는 전체 조회 API |
| `src/app/api/admin/submissions/[id]/route.ts` | PATCH 썸네일 코드 패스 + DELETE 썸네일 삭제 |
| `src/app/page.tsx` | `pdfThumbnailUrl` 조회 및 매핑 |
| `src/components/submission/AuthorTabs.tsx` | `pdfThumbnailUrl` prop 전달 |
| `src/components/submission/SubmissionCard.tsx` | `pdfThumbnailUrl` 우선 표시 |
| `src/components/submission/UploadForm.tsx` | PDF 업로드 후 썸네일 생성 |
| `src/app/admin/page.tsx` | 일괄 마이그레이션 버튼 |

---

### Task 1: 데이터 모델 + next.config.ts

**Files:**
- Modify: `src/types/submission.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: `Submission` 타입에 필드 추가**

`src/types/submission.ts`의 `Submission` 인터페이스에 `pdfThumbnailUrl?: string;` 추가:

```ts
export interface Submission {
  id: string;
  authorName: string;
  authorContact?: string;
  title: string;
  description?: string;
  pdfUrl: string;
  pdfThumbnailUrl?: string;   // ← 추가
  screenshots: string[];
  videoUrl?: string;
  status: SubmissionStatus;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}
```

- [ ] **Step 2: next.config.ts에 webpack canvas alias 추가**

현재 파일:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/empty-module.ts",
    },
  },
  images: { ... },
};
```

`import path from "path";` 추가 및 `webpack` 블록 추가 (turbopack 블록은 유지):

```ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/empty-module.ts",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: path.resolve(__dirname, "src/lib/empty-module.ts"),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: 빌드 오류 없는지 확인**

```bash
cd /Users/haul.lee/Desktop/claude/ai_study_introduce
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/types/submission.ts next.config.ts
git commit -m "feat: pdfThumbnailUrl 타입 추가, webpack canvas alias 추가"
```

---

### Task 2: PDF 썸네일 생성 유틸 (브라우저 전용)

**Files:**
- Create: `src/lib/pdf-thumbnail.ts`

- [ ] **Step 1: `src/lib/pdf-thumbnail.ts` 생성**

```ts
// 브라우저 전용 — Server Component나 API route에서 import 금지
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const SCALE = 1.5;
const JPEG_QUALITY = 0.85;

export async function generatePdfThumbnail(
  pdfData: ArrayBuffer
): Promise<Blob | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf-thumbnail.ts
git commit -m "feat: PDF 1페이지 JPEG 썸네일 생성 유틸 추가"
```

---

### Task 3: POST API — pdfThumbnailUrl 저장

**Files:**
- Modify: `src/app/api/submissions/route.ts`

- [ ] **Step 1: `pdfThumbnailUrl` destructure 및 Firestore 저장**

`src/app/api/submissions/route.ts`의 destructure 라인과 submission 객체를 수정:

```ts
const { password, authorName, authorContact, title, description, pdfUrl, screenshots, videoUrl, pdfThumbnailUrl } = body;
```

submission 객체에 추가:
```ts
const submission = {
  authorName: authorName.trim(),
  authorContact: authorContact?.trim() || null,
  title: title.trim(),
  description: description?.trim() || null,
  pdfUrl,
  pdfThumbnailUrl: pdfThumbnailUrl || null,   // ← 추가
  screenshots: screenshots || [],
  videoUrl: videoUrl?.trim() || null,
  status: "pending",
  createdAt: FieldValue.serverTimestamp(),
};
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/api/submissions/route.ts
git commit -m "feat: POST /api/submissions에서 pdfThumbnailUrl 저장"
```

---

### Task 4: PATCH + DELETE API 수정

**Files:**
- Modify: `src/app/api/admin/submissions/[id]/route.ts`

- [ ] **Step 1: PATCH에 pdfThumbnailUrl 코드 패스 추가**

현재 PATCH 핸들러의 `const { status } = await req.json();` 부분을 아래로 교체:

```ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, pdfThumbnailUrl } = body;

  try {
    if (typeof pdfThumbnailUrl !== "undefined") {
      // 썸네일 URL만 업데이트 (status 검증 불필요)
      await getAdminDb().collection("submissions").doc(id).update({
        pdfThumbnailUrl,
      });
      return NextResponse.json({ success: true });
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
    }

    await getAdminDb().collection("submissions").doc(id).update({
      status,
      approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null,
      approvedBy: admin.uid,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin PATCH error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: DELETE에 pdfThumbnailUrl 파일 삭제 추가**

DELETE 핸들러의 `filesToDelete` 배열을 수정:

```ts
const filesToDelete = [
  data.pdfUrl,
  data.pdfThumbnailUrl,   // ← 추가
  ...(data.screenshots || []),
  data.videoUrl,
].filter(Boolean);
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/submissions/[id]/route.ts
git commit -m "feat: PATCH에 pdfThumbnailUrl 업데이트 코드 패스 추가, DELETE에 썸네일 삭제 추가"
```

---

### Task 5: GET /api/admin/submissions/all 신규 엔드포인트

**Files:**
- Create: `src/app/api/admin/submissions/all/route.ts`

- [ ] **Step 1: 전체 제출물 조회 라우트 생성**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const snapshot = await getAdminDb().collection("submissions").get();

    const submissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      pdfUrl: doc.data().pdfUrl,
      pdfThumbnailUrl: doc.data().pdfThumbnailUrl || null,
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("admin all GET error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/submissions/all/route.ts
git commit -m "feat: GET /api/admin/submissions/all 전체 제출물 조회 API 추가"
```

---

### Task 6: 메인 페이지 — pdfThumbnailUrl 표시

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/submission/AuthorTabs.tsx`
- Modify: `src/components/submission/SubmissionCard.tsx`

- [ ] **Step 1: `page.tsx` 로컬 인터페이스 + 매핑 수정**

`page.tsx`의 `Submission` 인터페이스:
```ts
interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;   // ← 추가 (screenshots 제거)
  createdAt: string;
}
```

`getApprovedSubmissions()` map():
```ts
return snapshot.docs
  .map((doc) => ({
    id: doc.id,
    authorName: doc.data().authorName,
    title: doc.data().title,
    description: doc.data().description,
    pdfThumbnailUrl: doc.data().pdfThumbnailUrl || null,   // ← 추가 (screenshots 제거)
    createdAt: doc.data().approvedAt?.toDate().toISOString() || new Date().toISOString(),
  }))
```

- [ ] **Step 2: `AuthorTabs.tsx` 인터페이스 + prop 전달 수정**

로컬 `Submission` 인터페이스:
```ts
interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;   // ← 추가 (screenshots 제거)
  createdAt: string;
}
```

`SubmissionCard` 렌더링은 변경 없음 — spread로 전달되므로 자동으로 포함됨.

- [ ] **Step 3: `SubmissionCard.tsx` 인터페이스 + 썸네일 로직 수정**

로컬 인터페이스:
```ts
interface Submission {
  id: string;
  authorName: string;
  title: string;
  description?: string;
  pdfThumbnailUrl?: string;   // ← 추가 (screenshots 제거)
  createdAt: string;
}
```

썸네일 부분 교체:
```tsx
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
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 5: 개발 서버에서 메인 페이지 확인**

```bash
npm run dev
```

메인 페이지(`http://localhost:3000`)에서:
- 기존 제출물 카드에 PDF 아이콘이 보이면 정상 (아직 썸네일 미생성)
- 레이아웃 깨짐 없음 확인

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/components/submission/AuthorTabs.tsx src/components/submission/SubmissionCard.tsx
git commit -m "feat: 메인 페이지 카드 썸네일을 pdfThumbnailUrl 기반으로 변경"
```

---

### Task 7: UploadForm — 업로드 시 썸네일 자동 생성

**Files:**
- Modify: `src/components/submission/UploadForm.tsx`

- [ ] **Step 1: `generatePdfThumbnail` import 추가**

파일 상단에:
```ts
import { generatePdfThumbnail } from "@/lib/pdf-thumbnail";
```

- [ ] **Step 2: `handleSubmit`에서 PDF 업로드 후 썸네일 생성 추가**

PDF 업로드 완료 직후, 스크린샷 업로드 시작 전에 삽입:

```ts
// PDF 업로드
const pdfUrl = await uploadFile(
  pdfFile,
  `submissions/${tempId}/pdf/original.pdf`,
  (p) => setProgress((prev) => ({ ...prev, pdf: p }))
);

// PDF 썸네일 생성 (실패해도 계속 진행)
let pdfThumbnailUrl: string | null = null;
try {
  // File/Blob은 ReadableStream이 아니므로 uploadBytesResumable 이후에도 arrayBuffer() 재호출 안전
  const pdfData = await pdfFile.arrayBuffer();
  const thumbnailBlob = await generatePdfThumbnail(pdfData);
  if (thumbnailBlob) {
    pdfThumbnailUrl = await uploadFile(
      new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }),
      `submissions/${tempId}/pdf/thumbnail.jpg`,
      () => {}
    );
  }
} catch {
  // 썸네일 생성 실패는 무시
}

// 스크린샷 업로드
...
```

- [ ] **Step 3: API 호출 body에 `pdfThumbnailUrl` 포함**

```ts
body: JSON.stringify({
  password: form.password,
  authorName: form.authorName,
  authorContact: form.authorContact,
  title: form.title,
  description: form.description,
  pdfUrl,
  pdfThumbnailUrl,   // ← 추가
  screenshots,
  videoUrl,
}),
```

- [ ] **Step 4: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 5: 개발 서버에서 업로드 테스트**

```bash
npm run dev
```

`http://localhost:3000/upload`에서:
- PDF 파일 선택 후 제출
- Firebase Storage `submissions/{id}/pdf/thumbnail.jpg` 생성 확인
- Firestore에 `pdfThumbnailUrl` 필드 저장 확인

- [ ] **Step 6: Commit**

```bash
git add src/components/submission/UploadForm.tsx
git commit -m "feat: 업로드 시 PDF 1페이지 썸네일 자동 생성"
```

---

### Task 8: 어드민 — 기존 제출물 일괄 마이그레이션 버튼

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: 마이그레이션 상태 및 함수 추가**

`AdminPage` 컴포넌트 안에 상태 추가:

```ts
const [migrating, setMigrating] = useState(false);
const [migrateProgress, setMigrateProgress] = useState<string | null>(null);
```

마이그레이션 함수 추가:

```ts
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
      } catch {
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
```

- [ ] **Step 2: 어드민 페이지 UI에 버튼 추가**

`<main>` 안의 탭 위에 버튼 섹션 추가:

```tsx
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
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: 개발 서버에서 어드민 페이지 확인**

```bash
npm run dev
```

`http://localhost:3000/admin`에서:
- "PDF 썸네일 일괄 생성" 버튼 표시 확인
- 버튼 클릭 → 진행률 표시 확인
- 완료 후 메인 페이지에서 썸네일 이미지 표시 확인

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: 어드민 PDF 썸네일 일괄 마이그레이션 버튼 추가"
```

---

### Task 9: 최종 검증 및 배포

- [ ] **Step 1: 프로덕션 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공, 오류 없음

- [ ] **Step 2: 어드민에서 일괄 마이그레이션 실행**

배포 후 `/admin`에서 "PDF 썸네일 일괄 생성" 버튼 클릭.
기존 제출물 전체 처리 완료 확인.

- [ ] **Step 3: 메인 페이지에서 썸네일 표시 확인**

`/`에서 모든 카드가 PDF 1페이지 이미지로 표시되는지 확인.
