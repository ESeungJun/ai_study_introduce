"use client";

import { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
};

export default function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [minHeight, setMinHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const proxyUrl = `/api/pdf?url=${encodeURIComponent(url)}`;

  const prev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const next = () => setCurrentPage((p) => Math.min(numPages, p + 1));

  function handleRenderSuccess() {
    if (containerRef.current) {
      const h = containerRef.current.offsetHeight;
      if (h > 0) setMinHeight(h);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* PDF + 화살표 */}
      <div className="relative flex items-center justify-center w-full">
        {/* 왼쪽 화살표 */}
        <button
          onClick={prev}
          disabled={currentPage === 1}
          className="absolute left-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="이전 페이지"
        >
          ←
        </button>

        <Document
          file={proxyUrl}
          options={PDF_OPTIONS}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setCurrentPage(1);
          }}
          loading={<div className="py-20 text-gray-400 text-sm">PDF 불러오는 중...</div>}
          error={
            <div className="py-10 text-red-500 text-sm">
              PDF를 불러올 수 없습니다.{" "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline">직접 열기</a>
            </div>
          }
        >
          <div
            ref={containerRef}
            className="shadow-md rounded overflow-hidden"
            style={{ minHeight: minHeight || undefined }}
          >
            <Page
              pageNumber={currentPage}
              width={Math.min(1000, typeof window !== "undefined" ? window.innerWidth - 80 : 1000)}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div style={{ height: minHeight || "auto" }} />}
              onRenderSuccess={handleRenderSuccess}
            />
          </div>
        </Document>

        {/* 오른쪽 화살표 */}
        <button
          onClick={next}
          disabled={currentPage === numPages}
          className="absolute right-0 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white border shadow hover:bg-gray-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="다음 페이지"
        >
          →
        </button>
      </div>

      {/* 페이지 표시 */}
      {numPages > 0 && (
        <span className="text-sm text-gray-500">
          {currentPage} / {numPages}
        </span>
      )}
    </div>
  );
}
