import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { siteUrl } from "@/lib/siteUrl";

// 검색엔진에 알려 줄 페이지 목록(/sitemap.xml). 결제 결과 페이지는 검색에 나올 필요가 없어 뺍니다.
// 같은 내용의 한국어·영어 페이지는 서로의 짝(hreflang)으로 연결합니다.
const PAGES = [
  { path: "", priority: 1 },
  { path: "/terms", priority: 0.3 },
  { path: "/privacy", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, priority }) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl}/${l}${path}`]));
    return LOCALES.map((l) => ({
      url: `${siteUrl}/${l}${path}`,
      changeFrequency: "monthly" as const,
      priority,
      alternates: { languages },
    }));
  });
}
