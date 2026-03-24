# PDF 썸네일 설계 문서

## 개요

메인 페이지 카드의 썸네일을 항상 PDF 1페이지 이미지로 표시한다.
스크린샷 유무와 관계없이 `pdfThumbnailUrl`을 우선 사용하며,
기존 제출물은 어드민 페이지에서 일괄 마이그레이션한다.

---

## 의존성

`pdfjs-dist`는 이미 설치되어 있음 (v5.5.207). 추가 설치 불필요.

---

## 데이터 모델

`src/types/submission.ts`에 `pdfThumbnailUrl?: string` 필드 추가.
`CreateSubmissionInput`은 `Omit<Submission, ...>`이므로 자동으로 포함됨.

---

## next.config.ts 수정

현재 `turbopack.resolveAlias`에만 `canvas` 빈 모듈 alias가 있음.
프로덕션 빌드(webpack)에서도 동작하도록 **기존 turbopack 설정은 유지하면서** `webpack` 블록 추가:

```ts
webpack: (config) => {
  config.resolve.alias.canvas = path.resolve(__dirname, 'src/lib/empty-module.ts');
  return config;
}
```

---

## pdfjs-dist Worker 설정

브라우저에서 `pdfjs-dist`를 사용하려면 `GlobalWorkerOptions.workerSrc` 설정 필요.
CDN URL 방식 사용:

```ts
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```

---

## 썸네일 생성 유틸 함수 (브라우저 전용)

`src/lib/pdf-thumbnail.ts` 신규 파일. **브라우저/클라이언트 전용 — Server Component나 API route에서 import 금지.**

```ts
export async function generatePdfThumbnail(pdfData: ArrayBuffer): Promise<Blob | null>
```

- Worker 설정 포함
- scale: 1.5 고정
- JPEG quality: 0.85 고정
- 실패 시 `null` 반환 (예외 throw 안 함 — 비밀번호 보호 PDF, 손상된 PDF 등 모든 케이스 catch)

---

## 업로드 플로우 (새 제출물)

`UploadForm.tsx`에서 PDF 업로드 완료 직후:

1. `pdfFile.arrayBuffer()`로 읽어 `generatePdfThumbnail()`에 전달
2. 실패(`null` 반환) 시 `pdfThumbnailUrl` 없이 계속 진행 (업로드 중단 안 함)
3. 성공 시 Firebase Storage `submissions/{tempId}/pdf/thumbnail.jpg` 업로드
4. `pdfThumbnailUrl`을 `/api/submissions` POST body에 포함 (없으면 생략)

---

## POST API 수정

`/api/submissions/route.ts` POST 핸들러:
- body에서 `pdfThumbnailUrl` destructure
- Firestore document에 `pdfThumbnailUrl` 포함하여 저장 (없으면 `null`)

---

## 기존 제출물 마이그레이션

### 신규 API 엔드포인트
`GET /api/admin/submissions/all`
- 인증 필요 (기존 admin 라우트와 동일한 `verifyAdmin` 패턴 사용)
- 상태 필터 없이 전체 제출물 반환
- 응답에 `pdfThumbnailUrl` 필드 포함 (migration 루프에서 skip 판단에 사용)

### 어드민 페이지 버튼
**"PDF 썸네일 일괄 생성"** 버튼 추가 (클라이언트 컴포넌트). 동작:

1. `GET /api/admin/submissions/all`로 전체 제출물 조회
2. 이미 `pdfThumbnailUrl`이 있는 제출물은 건너뜀
3. 각 제출물마다 per-item `try/catch`로 오류 격리:
   - `/api/pdf?url=...` 프록시로 PDF fetch → `ArrayBuffer`
   - `generatePdfThumbnail()`로 1페이지 렌더링
   - JPEG blob → Firebase Storage `submissions/{id}/pdf/thumbnail.jpg` 업로드
   - `PATCH /api/admin/submissions/[id]`로 `pdfThumbnailUrl` 업데이트
   - 실패해도 다음 항목으로 계속 진행
4. 진행률 표시: "N / M 처리 완료 (K건 실패)"

---

## PATCH API 수정

`/api/admin/submissions/[id]/route.ts` PATCH 핸들러:

현재 코드는 `status`만 destructure하고 `["approved","rejected"]` 검증을 바로 실행함.
변경: `pdfThumbnailUrl` 여부를 먼저 체크하여 별도 코드 패스 처리:

```
if (typeof pdfThumbnailUrl !== "undefined") {
  → status 검증 없이 pdfThumbnailUrl만 Firestore 업데이트
} else if (status) {
  → 기존 status 처리 (["approved","rejected"] 검증 유지)
}
```

---

## DELETE API 수정

`/api/admin/submissions/[id]/route.ts` DELETE 핸들러:
- `filesToDelete` 배열에 `data.pdfThumbnailUrl`도 포함시켜 Storage에서 함께 삭제

---

## 메인 페이지 표시

### `page.tsx`
- 로컬 `Submission` 인터페이스에 `pdfThumbnailUrl?: string` 추가
- `getApprovedSubmissions()`의 `map()` 안에 `pdfThumbnailUrl: doc.data().pdfThumbnailUrl || null` 추가

### `AuthorTabs.tsx`
- 로컬 `Submission` 인터페이스에 `pdfThumbnailUrl?: string` 추가
- `SubmissionCard`에 `pdfThumbnailUrl` prop 전달

### `SubmissionCard.tsx`
- 로컬 `Submission` 인터페이스에 `pdfThumbnailUrl?: string` 추가, `screenshots` 필드 제거
- 썸네일 로직:
  1. `pdfThumbnailUrl` 있으면 `<Image>` 표시
  2. 없으면 PDF 아이콘 placeholder
- `screenshots[0]` 기반 썸네일 로직 제거
- `screenshots`는 상세 페이지(`SubmissionDetail.tsx`)에서만 사용하므로 메인 페이지 로컬 인터페이스에서 제거해도 무방

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/types/submission.ts` | `pdfThumbnailUrl?: string` 추가 |
| `src/lib/pdf-thumbnail.ts` | 신규: 공통 썸네일 생성 유틸 (브라우저 전용) |
| `next.config.ts` | webpack canvas alias 추가 (turbopack 유지) |
| `src/components/submission/UploadForm.tsx` | PDF 업로드 후 썸네일 생성 |
| `src/app/api/submissions/route.ts` | `pdfThumbnailUrl` Firestore 저장 |
| `src/app/api/admin/submissions/all/route.ts` | 신규: 전체 제출물 조회 (인증 필요, pdfThumbnailUrl 포함) |
| `src/app/api/admin/submissions/[id]/route.ts` | PATCH: 썸네일 업데이트 코드 패스 추가 / DELETE: 썸네일 Storage 삭제 |
| `src/app/page.tsx` | `pdfThumbnailUrl` 조회 및 map() 매핑 |
| `src/components/submission/AuthorTabs.tsx` | `pdfThumbnailUrl` prop 전달 |
| `src/components/submission/SubmissionCard.tsx` | `pdfThumbnailUrl` 우선 표시, screenshots 로직 제거 |
| `src/app/admin/page.tsx` | 일괄 마이그레이션 버튼 추가 |
