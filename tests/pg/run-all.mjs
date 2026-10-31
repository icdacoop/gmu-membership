// 카드 결제(PG) 시험을 한 번에 실행합니다: 빌드 → 가짜 PG·시트 서버 + 설정이 다른 앱 서버 5대 → 시험 3묶음 → 정리.
//   node tests/pg/run-all.mjs            (빌드부터)
//   node tests/pg/run-all.mjs --no-build (이미 빌드해 둔 .next 사용)
// 포트: 앱 서버 PORT_BASE+1~5 (기본 3191~3195), 가짜 서버 MOCK_PORT (기본 4010). 다른 프로젝트와 겹치지 않는 값을 쓰세요.
// 주의: 빌드는 .next 를 지우고 다시 만들므로, 이 프로젝트의 개발 서버(next dev)가 떠 있다면 먼저 끄세요.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const NEXT_BIN = require.resolve("next/dist/bin/next", { paths: [ROOT] });
const BASE = Number(process.env.PORT_BASE ?? 3190);
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 4010);
const MOCK = `http://localhost:${MOCK_PORT}`;
const noBuild = process.argv.includes("--no-build");

// 빈 값은 Windows 에서 사라져 .env.local 의 값이 되살아날 수 있으므로, "꺼짐"은 공백 한 칸으로 표시합니다.
// (서버 코드는 모두 trim() 해서 읽으므로 비어 있는 것과 같게 동작)
const OFF = " ";
const common = {
  ...process.env,
  VERCEL_ENV: undefined,
  GOOGLE_SCRIPT_URL: `${MOCK}/script`,
  APPLY_TOKEN: "t",
  PG_ENV: "sandbox",
  PG_SECRET_KEY: OFF,
};
const servers = {
  A: { port: BASE + 1, env: { PG_PUBLIC_KEY: "pk_test_mock", PG_API_BASE: `${MOCK}/pg`, PG_WEBHOOK_TOKEN: "whtoken", PG_WEBHOOK_IPS: OFF } },
  B: { port: BASE + 2, env: { PG_PUBLIC_KEY: "pk_test_mock", PG_API_BASE: `${MOCK}/pg`, PG_WEBHOOK_TOKEN: OFF, PG_WEBHOOK_IPS: OFF } },
  C: { port: BASE + 3, env: { PG_PUBLIC_KEY: "pk_test_mock", PG_API_BASE: `${MOCK}/pg`, PG_WEBHOOK_TOKEN: OFF, PG_WEBHOOK_IPS: "1.2.3.4" } },
  D: { port: BASE + 4, env: { PG_PUBLIC_KEY: OFF, PG_API_BASE: `${MOCK}/pg`, PG_WEBHOOK_TOKEN: OFF, PG_WEBHOOK_IPS: OFF } },
  E: { port: BASE + 5, env: { PG_PUBLIC_KEY: "pk_test_mock", PG_API_BASE: "http://localhost:4999/pg", PG_WEBHOOK_TOKEN: "whtoken", PG_WEBHOOK_IPS: OFF } },
};

const children = [];
function cleanup() {
  for (const c of children) {
    try {
      if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { stdio: "ignore" });
      else c.kill("SIGTERM");
    } catch { /* 이미 종료됨 */ }
  }
}
process.on("SIGINT", () => { cleanup(); process.exit(130); });

const busy = (port) => new Promise((resolve) => {
  const s = net.connect({ port, host: "127.0.0.1" });
  s.once("connect", () => { s.destroy(); resolve(true); });
  s.once("error", () => resolve(false));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, check, label) {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(url); if (await check(r)) return; } catch { /* 아직 안 떴음 */ }
    await sleep(1000);
  }
  throw new Error(`${label} 서버가 준비되지 않았습니다 (${url})`);
}

function runNode(args, env) {
  return spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: "inherit" }).status === 0;
}

let failed = false;
try {
  // 포트가 이미 쓰이고 있으면(다른 프로젝트의 서버일 수 있음) 시작하지 않습니다.
  for (const p of [MOCK_PORT, ...Object.values(servers).map((s) => s.port)]) {
    if (await busy(p)) throw new Error(`포트 ${p} 가 이미 사용 중입니다. PORT_BASE / MOCK_PORT 환경변수로 다른 포트를 지정하세요.`);
  }

  if (!noBuild) {
    console.log("== 빌드 (결제키 없는 상태로)");
    const b = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, env: { ...common, PG_PUBLIC_KEY: OFF }, encoding: "utf8" });
    if (b.status !== 0) { console.log(b.stdout?.slice(-2000), b.stderr?.slice(-2000)); throw new Error("빌드 실패"); }
    console.log("빌드 완료");
  }

  console.log("== 가짜 PG·시트 서버 시작");
  const mock = spawn(process.execPath, [path.join(HERE, "mock-servers.mjs")], { cwd: ROOT, env: { ...process.env, MOCK_PORT: String(MOCK_PORT) }, stdio: "ignore" });
  children.push(mock);
  await waitFor(`${MOCK}/_state`, (r) => r.ok, "가짜");

  console.log("== 앱 서버 5대 시작");
  for (const [name, s] of Object.entries(servers)) {
    const c = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(s.port)], { cwd: ROOT, env: { ...common, ...s.env }, stdio: "ignore" });
    children.push(c);
  }
  for (const [name, s] of Object.entries(servers)) {
    // 이 프로젝트의 서버인지 확인: /api/apply 는 GET 을 405 로 막는다 (다른 앱이면 404)
    await waitFor(`http://localhost:${s.port}/api/apply`, (r) => r.status === 405, `앱 ${name}`);
  }

  const env = { ...process.env, APP: `http://localhost:${servers.A.port}`, MOCK_PORT: String(MOCK_PORT), PORT_BASE: String(BASE) };
  for (const [label, args] of [
    ["승인 API", [path.join(HERE, "api.test.mjs"), "main"]],
    ["웹훅", [path.join(HERE, "api.test.mjs"), "webhook"]],
    ["설정별·요청 제한", [path.join(HERE, "config.test.mjs")]],
  ]) {
    console.log(`\n== ${label}`);
    if (!runNode(args, env)) { failed = true; console.log(`!! ${label} 시험 실패`); break; }
  }
} catch (err) {
  failed = true;
  console.error("!!", err.message);
} finally {
  cleanup();
}

console.log(failed ? "\n결과: 실패" : "\n결과: 모두 통과");
process.exit(failed ? 1 : 0);
