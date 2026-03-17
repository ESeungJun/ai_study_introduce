import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "번개장터 AI 스터디",
  description: "번개장터 AI 스터디 팀원들의 프로젝트 결과물 컬렉션",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
