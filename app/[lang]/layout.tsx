import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "./globals.css";
import { LOCALES, getDict, isLocale } from "@/lib/i18n";
import ScrollTop from "@/components/ScrollTop";
import { siteUrl } from "@/lib/siteUrl";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// 사이트 공통 기본값. canonical·hreflang·공유 태그는 페이지마다 달라서 각 페이지의 generateMetadata 가 만듭니다.
// (lib/seo.ts 의 pageMetadata)  metadataBase 덕분에 페이지에서 쓰는 상대 주소가 절대 주소로 바뀝니다.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    // data-scroll-behavior: CSS 에서 부드러운 스크롤(scroll-behavior: smooth)을 쓰므로, 다른 페이지로 이동할 때만
    // Next.js 가 이를 잠시 꺼서 새 페이지가 항상 맨 위에서 열리게 합니다. (없으면 이동 중 스크롤이 중간에 멈춤)
    <html lang={lang} data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <ScrollTop />
        {children}
      </body>
    </html>
  );
}
