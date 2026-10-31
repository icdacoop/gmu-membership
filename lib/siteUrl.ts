// 사이트의 대표 주소. robots.txt·sitemap.xml·공유 태그(OG)의 절대 주소를 만들 때 씁니다.
// 자체 도메인을 연결하면 NEXT_PUBLIC_SITE_URL 환경변수에 그 주소(https://…)를 넣으세요.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://gmu-membership.vercel.app");

// 운영 배포인지. 미리보기·로컬 빌드는 검색에 노출되지 않도록 robots.txt 를 전체 차단으로 만듭니다.
export const isProduction = process.env.VERCEL_ENV === "production";
