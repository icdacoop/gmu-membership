// 가짜 구글 시트(Apps Script)와 가짜 PG 를 한 서버에서 흉내 냅니다. 실제 시트·PG 에는 아무것도 보내지 않습니다.
//   POST /script                 : Apps Script (apply / get_order / mark_paid)
//   POST /pg/api/pay/confirm     : PG 승인 (paymentToken 값으로 시나리오 선택)
//   GET  /pg/api/get/:id         : PG 결과 조회
//   GET  /_state                 : 시험용 — 주문·호출 기록 확인 (?reset=1 이면 호출 기록 비움)
//   POST /_approve {id,amount}   : 시험용 — PG 쪽에서 승인된 거래로 만들기
//
// 토큰 시나리오(토큰 끝의 _0000000000 패딩은 무시): pat_ok, pat_declined, pat_expired, pat_confirming,
//   pat_already, pat_wrongamount, pat_wrongtrack, pat_nothrx, pat_500, 그 외=TOKEN_NOT_FOUND
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const orders = new Map();       // orderId -> {memberType, amount, status, txId, method}
const approvedAtPg = new Map(); // trackId -> {trxId, amount}
const pgCalls = [];             // PG 로 온 호출 기록
let seq = 0;

const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c).toString("utf8"))); });
const ok0000 = (trackId, amount, trxId) => ({ result: { resultCd: "0000", resultMsg: "정상", advanceMsg: "정상승인", create: "20261029120000" }, pay: { trxId, trackId, amount, authCd: "10134840" } });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const body = await readBody(req);

  if (req.method === "POST" && url.pathname === "/script") {
    const b = JSON.parse(body);
    if (b.token !== "t") return json(res, 200, { ok: false, error: "unauthorized" });
    if (b.action === "apply") {
      const id = `GMU-20261029-${String(++seq).padStart(4, "0")}`;
      orders.set(id, { memberType: b.member_type, amount: b.amount, status: "결제대기", txId: "", method: b.payment_method });
      return json(res, 200, { ok: true, orderId: id });
    }
    if (b.action === "get_order") {
      const o = orders.get(b.orderId);
      return o ? json(res, 200, { ok: true, memberType: o.memberType, amount: o.amount, status: o.status }) : json(res, 200, { ok: false, error: "order_not_found" });
    }
    if (b.action === "mark_paid") {
      const o = orders.get(b.orderId);
      if (!o) return json(res, 200, { ok: false, error: "order_not_found" });
      if (o.status === "결제완료" && b.status !== "환불") return json(res, 200, { ok: true, already: true });
      o.status = b.status;
      if (b.status === "결제완료") o.txId = b.txId || "";
      return json(res, 200, { ok: true });
    }
    return json(res, 200, { ok: false, error: "unknown_action" });
  }

  if (req.method === "POST" && url.pathname === "/pg/api/pay/confirm") {
    const auth = req.headers["authorization"];
    const b = JSON.parse(body);
    pgCalls.push({ type: "confirm", auth, contentType: req.headers["content-type"], body: b });
    if (auth !== "pk_test_mock") return json(res, 401, { code: "HTTP_401" });
    const { paymentToken, trackId, amount } = b.confirm ?? {};
    const trx = "T26102900" + String(pgCalls.length).padStart(2, "0");
    switch (String(paymentToken).replace(/_0+$/, "")) {
      case "pat_ok": approvedAtPg.set(trackId, { trxId: trx, amount }); return json(res, 200, ok0000(trackId, amount, trx));
      case "pat_declined": return json(res, 200, { result: { resultCd: "0051", message: "한도초과", advanceMsg: "승인거절" } });
      case "pat_expired": return json(res, 200, { result: { resultCd: "9999", message: "FAIL", advanceMsg: "TOKEN_EXPIRED" } });
      case "pat_confirming": return json(res, 200, { result: { resultCd: "9999", message: "CONFIRMING" } });
      case "pat_already": approvedAtPg.set(trackId, { trxId: "T2610290099", amount }); return json(res, 200, { result: { resultCd: "9999", advanceMsg: "ALREADY_CONFIRMED" } });
      case "pat_wrongamount": return json(res, 200, ok0000(trackId, amount + 1, trx));
      case "pat_wrongtrack": return json(res, 200, ok0000("GMU-OTHER-0001", amount, trx));
      case "pat_nothrx": return json(res, 200, { result: { resultCd: "0000" }, pay: { trackId, amount } });
      case "pat_500": res.writeHead(500, { "Content-Type": "text/html" }); return res.end("<html>Bad gateway</html>");
      default: return json(res, 200, { result: { resultCd: "9999", message: "TOKEN_NOT_FOUND" } });
    }
  }

  if (url.pathname.startsWith("/pg/api/get/")) {
    const id = decodeURIComponent(url.pathname.slice("/pg/api/get/".length));
    pgCalls.push({ type: "get", auth: req.headers["authorization"], id });
    const a = approvedAtPg.get(id);
    return a ? json(res, 200, ok0000(id, a.amount, a.trxId)) : json(res, 200, { result: { resultCd: "9999", message: "원거래 없음" } });
  }

  if (req.method === "POST" && url.pathname === "/_approve") {
    const b = JSON.parse(body);
    approvedAtPg.set(b.id, { trxId: b.trxId ?? "T2610290777", amount: b.amount });
    return json(res, 200, { ok: true });
  }
  if (url.pathname === "/_state") {
    const out = { orders: Object.fromEntries(orders), pgCalls: pgCalls.slice() };
    if (url.searchParams.get("reset") === "1") pgCalls.length = 0;
    return json(res, 200, out);
  }
  json(res, 404, { error: "not_found" });
}).listen(PORT, () => console.log(`mock ready on ${PORT}`));
