import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ko", "en"];
const DEFAULT_LOCALE = "ko";

// 브라우저 언어(Accept-Language)에서 한국어/영어 중 더 선호하는 쪽을 고릅니다.
function detectLocale(request: NextRequest) {
  const saved = request.cookies.get("lang")?.value;
  if (saved && LOCALES.includes(saved)) return saved;

  const header = request.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of ranked) {
    if (LOCALES.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // API, 내부 파일(_next), 확장자가 있는 정적 파일(로고·아이콘 등)은 제외
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
