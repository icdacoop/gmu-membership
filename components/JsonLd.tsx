import { ORG } from "@/lib/site";
import { siteUrl } from "@/lib/siteUrl";
import type { Dict, Locale } from "@/lib/i18n";

// 검색엔진에 단체 정보(이름·로고·연락처)를 구조화해서 알려 주는 데이터(JSON-LD, schema.org Organization).
// 주소는 사업자등록증 주소와 안내받은 주소가 달라 확정되기 전이라 넣지 않았습니다. (확정되면 address 를 추가)
export default function JsonLd({ lang, dict }: { lang: Locale; dict: Dict }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: dict.brand.name,
    alternateName: lang === "ko" ? [dict.brand.nameEn, ORG.abbr] : [ORG.abbr],
    url: `${siteUrl}/${lang}`,
    logo: `${siteUrl}/logo-original.png`,
    description: dict.tagline,
    email: ORG.email,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+82-${ORG.phone}`,
        email: ORG.email,
        availableLanguage: ["ko", "en"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // "<" 를 이스케이프해 문구 안에 </script> 가 들어가도 태그가 깨지지 않게 합니다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
