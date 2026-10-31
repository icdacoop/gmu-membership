// 사이트 아이콘 생성: app/icon.png(192), app/apple-icon.png(180), app/favicon.ico(16·32·48)
//   node scripts/make-icons.cjs                  → app/ 안의 아이콘 갱신
//   OUT_DIR=/tmp/icons node scripts/make-icons.cjs → 다른 폴더에 만들어 비교
// 원본: public/logo-original.png (225px 이므로 더 큰 원본이 있으면 교체하는 것이 좋습니다)
// 필요: sharp (Next.js 가 함께 설치함. 없으면 npm i -D sharp)
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const src = path.join(ROOT, "public", "logo-original.png");
const outDir = process.env.OUT_DIR ?? path.join(ROOT, "app");
fs.mkdirSync(outDir, { recursive: true });

// 원본 로고는 투명 배경이 없어 모서리가 흰 사각형이므로, 브라우저 탭용 아이콘은 로고 원 모양으로 잘라 투명하게 만듭니다.
async function circle(size) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 0.5}" fill="#fff"/></svg>`);
  return sharp(src).resize(size, size, { fit: "cover", kernel: "lanczos3" }).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toBuffer();
}

// PNG 여러 장을 담은 ICO 파일 (최신 브라우저는 PNG 내장 ICO 를 지원)
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = [], bodies = [];
  for (const { size, png } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0); d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt8(0, 2); d.writeUInt8(0, 3); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
    dirs.push(d); bodies.push(png); offset += png.length;
  }
  return Buffer.concat([header, ...dirs, ...bodies]);
}

(async () => {
  // 192 는 48 의 배수(구글 검색 결과 파비콘 권장 규격)
  fs.writeFileSync(path.join(outDir, "icon.png"), await circle(192));

  // 아이폰 홈 화면 아이콘: iOS 가 모서리를 둥글게 자르므로 원본(흰 배경 위의 로고)을 그대로 180px 로
  const apple = await sharp(src).resize(180, 180, { fit: "cover", kernel: "lanczos3" }).removeAlpha().png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(outDir, "apple-icon.png"), apple);

  const entries = [];
  for (const size of [16, 32, 48]) entries.push({ size, png: await circle(size) });
  fs.writeFileSync(path.join(outDir, "favicon.ico"), ico(entries));

  for (const f of ["icon.png", "apple-icon.png", "favicon.ico"]) console.log(f.padEnd(16), fs.statSync(path.join(outDir, f)).size + " bytes");
})();
