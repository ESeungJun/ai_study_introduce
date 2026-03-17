"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const proxyUrl = `/api/pdf?url=${encodeURIComponent(url)}`;

  const prev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const next = () => setCurrentPage((p) => Math.min(numPages, p + 1));

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
          <div className="shadow-md rounded overflow-hidden">
            <Page
              pageNumber={currentPage}
              width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 128 : 720)}
              renderTextLayer={true}
              renderAnnotationLayer={true}
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
