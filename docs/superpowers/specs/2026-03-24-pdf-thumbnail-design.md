# PDF 썸네일 설계 문서

## 개요

메인 페이지 카드의 썸네일을 항상 PDF 1페이지 이미지로 표시한다.
스크린샷 유무와 관계없이 `pdfThumbnailUrl`을 우선 사용하며,
기존 제출물은 어드민 페이지에서 일괄 마이그레이션한다.

---

## 데이터 모델

`src/types/submission.ts`에 `pdfThumbnailUrl?: string` 필드 추가.

---

## 업로드 플로우 (새 제출물)

`UploadForm.tsx`에서 PDF 업로드 완료 직후:

1. `pdfjs-dist`로 PDF 1페이지를 canvas에 렌더링
2. canvas → JPEG blob 변환
3. Firebase Storage `submissions/{tempId}/pdf/thumbnail.jpg`에 업로드
4. `pdfThumbnailUrl`을 `/api/submissions` POST body에 포함시켜 Firestore에 저장

---

## 기존 제출물 마이그레이션

어드민 페이지(`/admin`)에 **"PDF 썸네일 일괄 생성"** 버튼 추가.

동작:
1. 전체 제출물 목록 조회 (승인 여부 무관)
2. 각 제출물마다:
   - PDF fetch (`/api/pdf?url=...` 프록시 경유)
   - `pdfjs-dist`로 1페이지 canvas 렌더링
   - JPEG blob → Firebase Storage 업로드
   - `/api/admin/submissions/[id]` PATCH로 `pdfThumbnailUrl` 업데이트
3. 진행률 표시 (N / M 처리 완료)

---

## 메인 페이지 표시

### `page.tsx`
`getApprovedSubmissions()`에서 `pdfThumbnailUrl` 필드도 조회.

### `AuthorTabs.tsx`
`Submission` 인터페이스에 `pdfThumbnailUrl?: string` 추가, `SubmissionCard`에 전달.

### `SubmissionCard.tsx`
썸네일 우선순위:
1. `pdfThumbnailUrl` — 항상 우선 사용
2. 없으면 PDF 아이콘 placeholder (마이그레이션 전 일시적)

`screenshots[0]` 기반 썸네일 로직 제거.

---

## API 변경

### `POST /api/submissions`
`pdfThumbnailUrl` 필드 수신 및 Firestore 저장.

### `PATCH /api/admin/submissions/[id]`
`pdfThumbnailUrl` 업데이트 지원 (마이그레이션용).

---

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/types/submission.ts` | `pdfThumbnailUrl?: string` 추가 |
| `src/components/submission/UploadForm.tsx` | PDF 업로드 후 썸네일 생성 |
| `src/app/api/submissions/route.ts` | `pdfThumbnailUrl` 저장 |
| `src/app/page.tsx` | `pdfThumbnailUrl` 조회 |
| `src/components/submission/AuthorTabs.tsx` | `pdfThumbnailUrl` 전달 |
| `src/components/submission/SubmissionCard.tsx` | `pdfThumbnailUrl` 우선 표시 |
| `src/app/admin/page.tsx` | 일괄 마이그레이션 버튼 추가 |
| `src/app/api/admin/submissions/[id]/route.ts` | PATCH 지원 추가 |

---

## 의존성

- `pdfjs-dist` 패키지 추가 필요
