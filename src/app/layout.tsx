import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 한국어 가독성이 좋은 본고딕(Noto Sans KR). 글자 수가 많아 미리 불러오기(preload)는 끈다.
const notoKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["400", "500", "700"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "서부발전 뉴스 브리핑",
  description: "한국서부발전 관련 뉴스를 날짜별 카드로 모아 보는 브리핑",
};

export const viewport: Viewport = {
  themeColor: "#eef1f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoKr.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
