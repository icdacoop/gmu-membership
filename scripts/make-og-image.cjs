// 링크 미리보기(OG) 이미지 생성: public/og-image.png (1200x630)
// 어두운 배경 가운데에 로고 전체를 크게 놓습니다. 가운데 630x630 정사각형 안에 들어가므로
// 정사각형으로 잘라 보여 주는 앱(카카오톡 등)에서도 로고가 잘리지 않습니다.
//
//   node scripts/make-og-image.cjs                 → public/og-image.png 갱신
//   OUT=/tmp/og.png node scripts/make-og-image.cjs → 다른 곳에 만들어 비교
// 필요: sharp (Next.js 가 함께 설치함. 없으면 npm i -D sharp)
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const W = 1200, H = 630, LOGO = 400;
const src = path.join(ROOT, "public", "logo-original.png");
const out = process.env.OUT ?? path.join(ROOT, "public", "og-image.png");

const bg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#d71920" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#d71920" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#111111"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`);

(async () => {
  const meta = await sharp(src).metadata();
  console.log("원본 로고:", meta.width + "x" + meta.height, "alpha:", meta.hasAlpha);

  // 원본 로고는 투명 배경이 없어 모서리가 흰색 사각형으로 남으므로, 로고 원(원반) 모양으로 잘라 냅니다.
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO}" height="${LOGO}"><circle cx="${LOGO / 2}" cy="${LOGO / 2}" r="${LOGO / 2 - 2}" fill="#fff"/></svg>`);
  const logo = await sharp(src)
    .resize(LOGO, LOGO, { fit: "cover", kernel: "lanczos3" })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(bg)
    .composite([{ input: logo, left: Math.round((W - LOGO) / 2), top: Math.round((H - LOGO) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(out);

  const o = await sharp(out).metadata();
  console.log("생성:", out, o.width + "x" + o.height, fs.statSync(out).size + " bytes");
})();
