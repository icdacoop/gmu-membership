// 카드 승인 API(/api/payment/confirm)와 웹훅(/api/payment/webhook)을 가짜 PG·가짜 시트로 시험합니다.
// 사용: APP=http://localhost:3191 node tests/pg/api.test.mjs [main|webhook]
//   앱 서버는 run-all.mjs 가 환경변수와 함께 띄워 줍니다. (직접 띄울 때는 README 참고)
import assert from "node:assert";

const APP = process.env.APP ?? "http://localhost:3191";
const MOCK = `http://localhost:${process.env.MOCK_PORT ?? 4010}`;
const J = { "Content-Type": "application/json; charset=utf-8" };
let n = 0;
const ok = (name, cond, extra = "") => { assert.ok(cond, `${name} ${extra}`); n++; console.log("PASS", name); };

// 요청마다 다른 IP 로 보이게 해 접수 제한(IP당 10분 5건)에 걸리지 않도록 함. (제한 자체는 config.test.mjs 에서 시험)
let ipSeq = 0;
const fakeIp = () => `10.1.${Math.floor(++ipSeq / 250)}.${(ipSeq % 250) + 1}`;
const post = async (path, body, headers = {}) => {
  const r = await fetch(APP + path, { method: "POST", headers: { ...J, "x-forwarded-for": fakeIp(), ...headers }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const state = async (reset = false) => (await fetch(`${MOCK}/_state${reset ? "?reset=1" : ""}`)).json();
const base = { lang: "ko", phone: "01012345678", email: "a@b.co", interest: "영상", consent: true };
const apply = async (extra) => (await post("/api/apply", { ...base, ...extra })).body;
// 실제 토큰처럼 길이를 맞추기 위해 패딩을 붙임 (서버는 8자 미만 토큰을 PG 에 보내지 않음)
const confirm = (orderId, amount, token, lang = "ko") =>
  post("/api/payment/confirm", { orderId, amount, payload: token === undefined ? {} : { paymentToken: token + "_0000000000" }, lang });
const hook = async (fields, { query = "?k=whtoken", headers = {} } = {}) => {
  const r = await fetch(`${APP}/api/payment/webhook${query}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", ...headers }, body: new URLSearchParams(fields).toString() });
  return { status: r.status, text: await r.text(), ct: r.headers.get("content-type") };
};
const orderOf = async (id) => (await state()).orders[id];

const suite = process.argv[2] ?? "main";

if (suite === "main") {
  // ── 접수 ──
  const a = await apply({ memberType: "individual", name: "홍길동", paymentMethod: "card" });
  ok("카드 접수: 성공, pg 공개값(결제키·환경)만 내려줌", a.ok && a.pg?.publicKey === "pk_test_mock" && a.pg?.env === "sandbox" && a.bank === null && a.amount === 200000);
  ok("카드 접수 응답에 서버 호출용 키 같은 다른 값이 없음", Object.keys(a.pg).sort().join() === "env,publicKey");
  const b = await apply({ memberType: "individual", name: "홍길동", paymentMethod: "bank" });
  ok("계좌이체 접수: pg 없음", b.ok && b.pg === null && b.bank !== undefined);
  ok("시트에 결제수단=카드 로 저장 요청", (await orderOf(a.orderId)).method === "카드");

  // ── 승인 확인 ──
  let r = await confirm("abc", 200000, "pat_ok");
  ok("잘못된 접수번호 형식 → 400", r.status === 400);
  r = await confirm("GMU-99999999-9999", 200000, "pat_ok");
  ok("없는 접수번호 → 404", r.status === 404);
  r = await confirm(a.orderId, 1, "pat_ok");
  ok("금액 조작(1원) → 400, PG 호출 없음", r.status === 400 && (await state()).pgCalls.length === 0);
  r = await confirm(a.orderId, 200000);
  ok("결제 토큰 없음 → 502, 결제실패로 기록하지 않음", r.status === 502 && r.body.declined === false && (await orderOf(a.orderId)).status === "결제대기");
  r = await post("/api/payment/confirm", { orderId: a.orderId, amount: 200000, payload: { paymentToken: "pat_ok" }, lang: "ko" });
  ok("너무 짧은 토큰 → 502(PG 호출 안 함), 결제실패로 기록하지 않음", r.status === 502 && (await state()).pgCalls.length === 0 && (await orderOf(a.orderId)).status === "결제대기");

  await state(true);
  r = await confirm(a.orderId, 200000, "pat_ok");
  const st = await state(true);
  ok("정상 승인 → 200, trxId 반환", r.status === 200 && r.body.ok && /^T\d+/.test(r.body.trxId));
  ok("시트: 결제완료 + 거래번호 기록", (await orderOf(a.orderId)).status === "결제완료" && (await orderOf(a.orderId)).txId === r.body.trxId);
  const call = st.pgCalls.find((c) => c.type === "confirm");
  ok("PG 승인 호출 형식: Authorization=결제키, JSON, confirm{paymentToken,trackId,amount}", call.auth === "pk_test_mock" && call.contentType === "application/json" && call.body.confirm.paymentToken === "pat_ok_0000000000" && call.body.confirm.trackId === a.orderId && call.body.confirm.amount === 200000);
  r = await confirm(a.orderId, 200000, "pat_ok");
  ok("같은 건 재호출 → already, PG 를 다시 부르지 않음", r.body.already === true && (await state()).pgCalls.length === 0);

  // ── 거절·오류 분류 ──
  const d = await apply({ memberType: "individual", name: "거절", paymentMethod: "card" });
  r = await confirm(d.orderId, 200000, "pat_declined");
  ok("카드사 거절(0051) → 502 declined=true, 시트 결제실패", r.status === 502 && r.body.declined === true && (await orderOf(d.orderId)).status === "결제실패");
  r = await confirm(d.orderId, 200000, "pat_ok");
  ok("결제실패 후 다시 결제 → 결제완료로 갱신", r.status === 200 && (await orderOf(d.orderId)).status === "결제완료");

  for (const [tok, label] of [["pat_expired", "토큰 만료"], ["pat_confirming", "승인 처리 중"], ["pat_500", "PG 서버 오류(HTML)"], ["pat_unknown", "알 수 없는 토큰"]]) {
    const e = await apply({ memberType: "individual", name: label, paymentMethod: "card" });
    r = await confirm(e.orderId, 200000, tok);
    ok(`${label} → 502, 거절로 기록하지 않음(재시도 가능)`, r.status === 502 && r.body.declined === false && (await orderOf(e.orderId)).status === "결제대기");
  }
  for (const [tok, label] of [["pat_wrongamount", "승인 금액이 다름"], ["pat_wrongtrack", "주문번호가 다름"], ["pat_nothrx", "거래번호 없음"]]) {
    const e = await apply({ memberType: "individual", name: label, paymentMethod: "card" });
    r = await confirm(e.orderId, 200000, tok);
    ok(`${label} → 502, 결제완료로 기록하지 않음`, r.status === 502 && (await orderOf(e.orderId)).status === "결제대기");
  }
  const al = await apply({ memberType: "individual", name: "이미승인", paymentMethod: "card" });
  r = await confirm(al.orderId, 200000, "pat_already");
  ok("ALREADY_CONFIRMED → 조회로 확인해 결제완료 처리", r.status === 200 && (await orderOf(al.orderId)).status === "결제완료" && (await orderOf(al.orderId)).txId === "T2610290099");

  // ── 기업회원 금액 ──
  const c = await apply({ memberType: "corporate", companyName: "회사", ceoName: "대표", paymentMethod: "card" });
  r = await confirm(c.orderId, 500000, "pat_ok");
  ok("기업회원: 옛 금액 500,000 으로는 승인 불가", c.amount === 1000000 && r.status === 400);
  r = await confirm(c.orderId, 1000000, "pat_ok");
  ok("기업회원: 1,000,000 승인", r.status === 200 && (await orderOf(c.orderId)).status === "결제완료");

  // ── 영어 오류 문구 ──
  const en = await apply({ memberType: "individual", name: "Jane", paymentMethod: "card", lang: "en" });
  r = await confirm(en.orderId, 200000, "pat_declined", "en");
  ok("영어 요청은 영어 오류 문구", /Something went wrong/.test(r.body.error));
}

if (suite === "webhook") {
  const mk = async (type = "individual", extra = {}) =>
    apply({ memberType: type, ...(type === "individual" ? { name: "웹훅" } : { companyName: "웹훅회사", ceoName: "대표" }), paymentMethod: "card", ...extra });
  const approveAtPg = (id, amount, trxId = "T2610290555") => fetch(`${MOCK}/_approve`, { method: "POST", body: JSON.stringify({ id, amount, trxId }) });
  const korean = { issuer: "국민", acquirer: "국민", cardType: "신용" };

  let r = await hook({ trxType: "PAY", trackId: "GMU-X", amount: "1" }, { query: "" });
  ok("토큰 없이 호출 → 403", r.status === 403);
  r = await hook({ trxType: "PAY", trackId: "GMU-X", amount: "1" }, { query: "?k=wrong" });
  ok("틀린 토큰 → 403", r.status === 403);

  const p1 = await mk();
  await approveAtPg(p1.orderId, 200000);
  r = await hook({ trxType: "PAY", trackId: p1.orderId, amount: "200000", trxId: "T2610290555", authCd: "123", ...korean });
  ok("PAY 알림 + PG 조회로 확인 → 응답 본문은 정확히 OK(200, text/plain)", r.status === 200 && r.text === "OK" && /text\/plain/.test(r.ct));
  const o1 = await orderOf(p1.orderId);
  ok("PAY: 시트 결제완료 + PG 조회로 확인한 거래번호 기록", o1.status === "결제완료" && o1.txId === "T2610290555");

  const p2 = await mk(); // PG 에는 승인 기록이 없음 (위조 알림)
  r = await hook({ trxType: "PAY", trackId: p2.orderId, amount: "200000", trxId: "FAKE" });
  ok("위조 PAY 알림(PG 조회에 승인 없음) → OK 로 응답하되 시트는 그대로", r.text === "OK" && (await orderOf(p2.orderId)).status === "결제대기");

  const p3 = await mk();
  await approveAtPg(p3.orderId, 1);
  r = await hook({ trxType: "PAY", trackId: p3.orderId, amount: "1", trxId: "T1" });
  ok("금액이 시트와 다른 PAY 알림 → 반영 안 함", r.text === "OK" && (await orderOf(p3.orderId)).status === "결제대기");

  r = await hook({ trxType: "PAY", trackId: "OTHER-SHOP-1", amount: "1000" });
  ok("우리 접수번호가 아닌 알림 → OK(재전송 중단)", r.status === 200 && r.text === "OK");
  r = await hook({ trxType: "PAY", trackId: "GMU-20269999-0001", amount: "200000" });
  ok("시트에 없는 접수번호 → OK", r.status === 200 && r.text === "OK");

  r = await hook({ trxType: "REFUND", trackId: p1.orderId, amount: "200000", rootTrxId: "T2610290555", trxId: "T2610290556" });
  ok("REFUND(전액) → 시트 환불", r.text === "OK" && (await orderOf(p1.orderId)).status === "환불");
  r = await hook({ trxType: "REFUND", trackId: p1.orderId, amount: "200000" });
  ok("같은 REFUND 재수신 → OK, 변화 없음", r.text === "OK" && (await orderOf(p1.orderId)).status === "환불");

  const p4 = await mk(); await approveAtPg(p4.orderId, 200000, "T2610290601");
  await hook({ trxType: "PAY", trackId: p4.orderId, amount: "200000", trxId: "T2610290601" });
  r = await hook({ trxType: "REFUND", trackId: p4.orderId, amount: "50000" });
  ok("부분 취소 알림 → 자동 반영 안 함(결제완료 유지)", r.text === "OK" && (await orderOf(p4.orderId)).status === "결제완료");
  r = await hook({ trxType: "REFUND", trackId: p2.orderId, amount: "200000" });
  ok("결제완료가 아닌 건의 취소 알림 → 반영 안 함", (await orderOf(p2.orderId)).status === "결제대기");

  const j = await fetch(`${APP}/api/payment/webhook?k=whtoken`, { method: "POST", headers: J, body: JSON.stringify({ trxType: "PAY", trackId: "OTHER-1", amount: "1" }) });
  ok("JSON 본문도 처리(OK)", (await j.text()) === "OK");
  r = await hook({});
  ok("빈 알림 → OK(오류 없이)", r.status === 200 && r.text === "OK");
  r = await hook({ trxType: "SOMETHING", trackId: p4.orderId, amount: "200000" });
  ok("알 수 없는 거래구분 → OK, 변화 없음", r.text === "OK" && (await orderOf(p4.orderId)).status === "결제완료");
}

console.log(`\n${n} checks passed (${suite})`);
