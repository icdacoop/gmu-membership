// 설정이 다른 서버 5대(A~E)와 요청 제한을 시험합니다. run-all.mjs 가 서버를 띄운 뒤 실행합니다.
//   A: 전체 설정(웹훅 토큰) / B: 웹훅 토큰·IP 없음 / C: IP 허용 목록만 / D: 결제키 없음 / E: PG 서버 연결 불가
import assert from "node:assert";

const MOCK = `http://localhost:${process.env.MOCK_PORT ?? 4010}`;
const BASE = Number(process.env.PORT_BASE ?? 3190);
const [A, B, C, D, E] = [1, 2, 3, 4, 5].map((i) => `http://localhost:${BASE + i}`);
const J = { "Content-Type": "application/json; charset=utf-8" };
let n = 0, ipSeq = 100;
const ok = (name, cond) => { assert.ok(cond, name); n++; console.log("PASS", name); };
const fakeIp = () => `10.9.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;
const base = { lang: "ko", phone: "01012345678", email: "a@b.co", interest: "영상", consent: true, memberType: "individual" };
const apply = async (app, extra = {}, ip = fakeIp()) => {
  const r = await fetch(app + "/api/apply", { method: "POST", headers: { ...J, "x-forwarded-for": ip }, body: JSON.stringify({ ...base, name: "설정시험", ...extra }) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const orderOf = async (id) => (await (await fetch(`${MOCK}/_state`)).json()).orders[id];
const hook = async (app, fields, { query = "", headers = {} } = {}) => {
  const r = await fetch(`${app}/api/payment/webhook${query}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(fields).toString() });
  return { status: r.status, text: await r.text() };
};
const approveAtPg = (id, amount, trxId) => fetch(`${MOCK}/_approve`, { method: "POST", body: JSON.stringify({ id, amount, trxId }) });
const confirm = async (app, orderId, token) => {
  const r = await fetch(app + "/api/payment/confirm", { method: "POST", headers: { ...J, "x-forwarded-for": fakeIp() }, body: JSON.stringify({ orderId, amount: 200000, payload: { paymentToken: token + "_0000000000" }, lang: "ko" }) });
  return { status: r.status, body: await r.json().catch(() => null) };
};

// ── B: 웹훅 토큰·IP 모두 없음 ──
{
  const a = (await apply(B, { paymentMethod: "card" })).body;
  await approveAtPg(a.orderId, 200000, "T2610290801");
  let r = await hook(B, { trxType: "PAY", trackId: a.orderId, amount: "200000" });
  ok("B(보호 설정 없음): PAY 는 PG 조회로 확인되면 반영", r.text === "OK" && (await orderOf(a.orderId)).status === "결제완료");
  r = await hook(B, { trxType: "REFUND", trackId: a.orderId, amount: "200000" });
  ok("B(보호 설정 없음): REFUND 는 반영하지 않고 무시(OK 응답)", r.text === "OK" && (await orderOf(a.orderId)).status === "결제완료");
}

// ── C: IP 허용 목록만 ──
{
  const a = (await apply(C, { paymentMethod: "card" })).body;
  await approveAtPg(a.orderId, 200000, "T2610290802");
  let r = await hook(C, { trxType: "PAY", trackId: a.orderId, amount: "200000" }, { headers: { "x-forwarded-for": "9.9.9.9" } });
  ok("C: 허용 목록에 없는 IP → 403, 시트 변화 없음", r.status === 403 && (await orderOf(a.orderId)).status === "결제대기");
  r = await hook(C, { trxType: "PAY", trackId: a.orderId, amount: "200000" }, { headers: { "x-forwarded-for": "1.2.3.4" } });
  ok("C: 허용된 IP 의 PAY → 반영", r.text === "OK" && (await orderOf(a.orderId)).status === "결제완료");
  r = await hook(C, { trxType: "REFUND", trackId: a.orderId, amount: "200000" }, { headers: { "x-forwarded-for": "1.2.3.4" } });
  ok("C: 허용된 IP 의 REFUND → 환불 반영", r.text === "OK" && (await orderOf(a.orderId)).status === "환불");
  r = await hook(C, { trxType: "PAY", trackId: a.orderId, amount: "200000" }, { headers: { "x-forwarded-for": "1.2.3.4, 8.8.8.8" } });
  ok("C: x-forwarded-for 의 첫 번째 주소를 기준으로 판단", r.status === 200);
}

// ── D: 결제키 없음(카드 미개통) ──
{
  const card = await apply(D, { paymentMethod: "card" });
  ok("D(결제키 없음): 카드 접수 거절(400)", card.status === 400 && /카드 결제는 아직/.test(card.body.error));
  const bank = await apply(D, { paymentMethod: "bank" });
  ok("D(결제키 없음): 계좌이체 접수는 정상", bank.status === 200 && bank.body.pg === null);
  const c = await confirm(D, bank.body.orderId, "pat_ok");
  ok("D(결제키 없음): 승인 확인 API → 503", c.status === 503);
  const w = await hook(D, { trxType: "PAY", trackId: bank.body.orderId, amount: "200000" });
  ok("D(결제키 없음): 웹훅 → 500(PG 가 재전송하도록)", w.status === 500);
}

// ── E: PG 서버에 연결할 수 없음 ──
{
  const a = (await apply(E, { paymentMethod: "card" })).body;
  const c = await confirm(E, a.orderId, "pat_ok");
  ok("E(PG 연결 불가): 승인 확인 → 502, 거절로 기록하지 않음", c.status === 502 && c.body.declined === false && (await orderOf(a.orderId)).status === "결제대기");
  const w = await hook(E, { trxType: "PAY", trackId: a.orderId, amount: "200000" }, { query: "?k=whtoken" });
  ok("E(PG 연결 불가): PAY 웹훅 → 500(재전송 요청), 시트 변화 없음", w.status === 500 && (await orderOf(a.orderId)).status === "결제대기");
}

// ── A: 접수 제한(IP당 10분 5건), 승인 확인 제한(20건) ──
{
  const ip = "203.0.113.50";
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await apply(A, { paymentMethod: "bank" }, ip)).status);
  ok("접수 제한: 같은 IP 5건까지만, 6번째부터 429", codes.slice(0, 5).every((c) => c === 200) && codes[5] === 429 && codes[6] === 429);
  const ip2 = "203.0.113.60";
  const last = [];
  for (let i = 0; i < 22; i++) {
    const r = await fetch(A + "/api/payment/confirm", { method: "POST", headers: { ...J, "x-forwarded-for": ip2 }, body: JSON.stringify({ orderId: "abc", amount: 1 }) });
    last.push(r.status);
  }
  ok("승인 확인 제한: 같은 IP 20건까지만, 21번째부터 429", last.slice(0, 20).every((c) => c === 400) && last[20] === 429);
}

console.log(`\n${n} checks passed (config)`);
