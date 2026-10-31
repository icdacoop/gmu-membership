import type { MetadataRoute } from "next";
import { isProduction, siteUrl } from "@/lib/siteUrl";

// 검색엔진 봇 안내(/robots.txt).
// - 운영 배포: 사이트 전체를 허용하되, 검색에 나올 필요가 없는 API와 결제 결과 페이지는 막습니다.
// - 그 외(미리보기·로컬 빌드 등): 잘못 검색에 노출되지 않도록 전체를 막습니다.
export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/ko/payment/", "/en/payment/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
