// 사이트의 검색·공유용 메타 정보를 페이지별로 수집해 보여 줍니다. (읽기만 함)
//   node tests/seo-audit.mjs [사이트 주소]      기본: https://gmu-membership.vercel.app
// 확인 항목: title, description, canonical, hreflang, og:*, twitter:*, robots 메타, 아이콘, h1 개수, JSON-LD
// robots.txt / sitemap.xml / 아이콘 파일 응답은 아래 두 번째 구간에서 확인합니다.
const U = (process.argv[2] ?? "https://gmu-membership.vercel.app").replace(/\/$/, "");
const pages = ["/ko", "/en", "/ko/privacy", "/en/privacy", "/ko/terms", "/en/terms", "/ko/payment/fail", "/en/payment/fail", "/ko/payment/success"];

const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];
const decode = (s) => (s ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

for (const p of pages) {
  const r = await fetch(U + p, { redirect: "manual" });
  const html = await r.text();
  const metas = [...html.matchAll(/<meta\s[^>]*>/g)].map((m) => m[0]);
  const links = [...html.matchAll(/<link\s[^>]*>/g)].map((m) => m[0]);
  const meta = (key, by = "name") => metas.filter((t) => attr(t, by) === key).map((t) => decode(attr(t, "content")));
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1]);
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const canonical = links.filter((t) => attr(t, "rel") === "canonical").map((t) => attr(t, "href"));
  const alternates = links.filter((t) => attr(t, "rel") === "alternate").map((t) => `${attr(t, "hrefLang") ?? attr(t, "hreflang")}=${attr(t, "href")}`);
  const icons = links.filter((t) => /icon/.test(attr(t, "rel") ?? "")).map((t) => `${attr(t, "rel")}:${attr(t, "href")}${attr(t, "sizes") ? ` (${attr(t, "sizes")})` : ""}`);
  const d = meta("description")[0];
  console.log(`\n=== ${p}  [HTTP ${r.status}]  x-robots-tag: ${r.headers.get("x-robots-tag") ?? "-"}`);
  console.log("html lang      :", (html.match(/<html[^>]*lang="([^"]*)"/) || [])[1]);
  console.log("title          :", title, `(${[...title].length}자)`);
  console.log("description    :", d ? `${d.slice(0, 70)}… (${[...d].length}자)` : "(없음)");
  console.log("robots meta    :", meta("robots").join(" | ") || "(없음)");
  console.log("canonical      :", canonical.join(", ") || "(없음)");
  console.log("hreflang       :", alternates.join(", ") || "(없음)");
  console.log("og:title       :", meta("og:title", "property").join(" | ") || "(없음)");
  console.log("og:description :", (meta("og:description", "property")[0] ?? "(없음)").slice(0, 50));
  console.log("og:image       :", meta("og:image", "property").join(" | ") || "(없음)", "/", meta("og:image:width", "property")[0] + "x" + meta("og:image:height", "property")[0]);
  console.log("og:url/type/loc:", meta("og:url", "property")[0], "|", meta("og:type", "property")[0], "|", meta("og:locale", "property")[0], "| site:", meta("og:site_name", "property")[0]);
  console.log("twitter        :", meta("twitter:card").join(","), "|", meta("twitter:image").join(","));
  console.log("theme-color    :", meta("theme-color").join(",") || "(없음)", "| viewport:", meta("viewport").join(",") || "(없음)");
  console.log("icons          :", icons.join(" ; ") || "(없음)");
  console.log("h1             :", h1.length, "개 →", h1.join(" / ").slice(0, 60));
  console.log("JSON-LD        :", /application\/ld\+json/.test(html) ? "있음" : "없음");
}

console.log("\n=== 검색봇·아이콘 파일");
for (const p of ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/icon.png", "/apple-icon.png", "/og-image.png"]) {
  const r = await fetch(U + p);
  console.log(p.padEnd(18), r.status, r.headers.get("content-type"));
}
