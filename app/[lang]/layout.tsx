import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "./globals.css";
import { LOCALES, getDict, isLocale } from "@/lib/i18n";
import ScrollTop from "@/components/ScrollTop";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// 링크 미리보기(OG 이미지)의 주소를 절대 주소로 만들 때 쓰는 사이트 주소.
// 자체 도메인을 연결하면 NEXT_PUBLIC_SITE_URL 환경변수에 그 주소(https://…)를 넣으세요.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://gmu-membership.vercel.app");

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);
  // public/og-image.png: 1200x630, 로고 전체가 가운데에 보이는 공유용 이미지
  const image = { url: "/og-image.png", width: 1200, height: 630, alt: dict.brand.logoAlt };
  return {
    metadataBase: new URL(siteUrl),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: { languages: { ko: "/ko", en: "/en" } },
    openGraph: {
      type: "website",
      siteName: dict.brand.name,
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${lang}`,
      locale: lang === "ko" ? "ko_KR" : "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
      images: [image.url],
    },
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
    <html lang={lang}>
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
