// 브라우저 전용 — Server Component나 API route에서 import 금지
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const SCALE = 1.5;
const JPEG_QUALITY = 0.85;

export async function generatePdfThumbnail(
  pdfData: ArrayBuffer
): Promise<Blob | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d")!;
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });

    // 리소스 해제
    canvas.width = 0;
    await pdf.destroy();

    return blob;
  } catch (err) {
    console.error("[pdf-thumbnail] 썸네일 생성 실패:", err);
    return null;
  }
}
