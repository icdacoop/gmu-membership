import type { Metadata } from "next";
import type { Dict, Locale } from "@/lib/i18n";

// 페이지별 검색·공유용 메타 정보를 만듭니다. (metadataBase 는 레이아웃에 있어 아래 주소는 절대 주소로 바뀝니다)
//   path: 언어를 뺀 경로. 메인은 "", 이용약관은 "/terms"
// - canonical: 그 페이지 자기 자신의 주소
// - hreflang: 같은 내용의 한국어·영어 짝(x-default 는 한국어)
// - OG/트위터: 페이지 자신의 제목·설명·주소로 공유되게 함
export function pageMetadata(
  lang: Locale,
  dict: Dict,
  path: string,
  info: { title: string; description: string },
): Metadata {
  const url = `/${lang}${path}`;
  const image = { url: "/og-image.png", width: 1200, height: 630, alt: dict.brand.logoAlt };
  return {
    title: info.title,
    description: info.description,
    alternates: {
      canonical: url,
      languages: { ko: `/ko${path}`, en: `/en${path}`, "x-default": `/ko${path}` },
    },
    openGraph: {
      type: "website",
      siteName: dict.brand.name,
      title: info.title,
      description: info.description,
      url,
      locale: lang === "ko" ? "ko_KR" : "en_US",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: info.title,
      description: info.description,
      images: [image.url],
    },
  };
}
