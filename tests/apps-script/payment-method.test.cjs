// 결제수단 열·결제여부 드롭다운·결제일시 자동 기록(onEdit)·기존 시트 호환을 시험합니다.
const assert = require("node:assert");
const { load, HEADERS } = require("./harness.cjs");

const HEAD15 = HEADERS.slice(0, 15); // 결제수단 열이 생기기 전의 예전 시트
const apply = { member_type: "기업", name: "대표", company_name: "회사", phone: "010-0000-0000", email: "a@b.co", interest: "영상", payment_method: "계좌이체", amount: 500000, consent_at: "x", lang: "한국어" };
const isDate = (v) => Object.prototype.toString.call(v) === "[object Date]"; // vm 안에서 만든 Date 도 인식
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("PASS", name); };
const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

// 1) 새 시트
{
  const t = load([]);
  const r = t.post(apply);
  ok("새 시트: 접수 성공·접수번호", () => same([r.ok, r.orderId], [true, "GMU-20261101-0001"]));
  ok("새 시트: 머리글 16칸, 마지막이 결제수단", () => { assert.strictEqual(t.grid[0].length, 16); assert.strictEqual(t.grid[0][15], "결제수단"); });
  ok("새 시트: 데이터 행 16칸, P열=계좌이체, I열=결제대기", () => { assert.strictEqual(t.grid[1].length, 16); assert.strictEqual(t.grid[1][15], "계좌이체"); assert.strictEqual(t.grid[1][8], "결제대기"); });
  ok("새 시트: 결제여부 드롭다운(I열, 4개 값, 임의 입력 불가)", () => { const v = t.sheet.validations[0]; assert.strictEqual(v.col, 9); same(v.list, ["결제대기", "결제완료", "결제실패", "환불"]); assert.strictEqual(v.allowInvalid, false); });
  ok("알림 메일에 결제수단 포함", () => assert.match(t.mails[0].text, /결제수단: 계좌이체/));
}

// 2) 예전 15열 시트
{
  const old = ["GMU-20261025-0001", "d", "기업", "김", "회", "010", "e", "관", "결제대기", 500000, "", "", "c", "", "한국어"];
  const t = load([HEAD15, old]);
  const r = t.post({ ...apply, payment_method: "카드" });
  ok("예전 시트: 머리글 P열만 추가, 기존 행 보존", () => { assert.strictEqual(t.grid[0][15], "결제수단"); assert.strictEqual(t.grid[1][0], "GMU-20261025-0001"); assert.strictEqual(t.grid[1].length, 15); });
  ok("예전 시트: 새 접수 성공, P열=카드", () => { assert.strictEqual(r.ok, true); assert.strictEqual(t.grid[2][15], "카드"); });
  ok("예전 시트: 드롭다운 적용", () => assert.ok(t.sheet.validations.length >= 1));
  ok("get_order 가 예전 행도 읽음", () => same(t.post({ action: "get_order", orderId: "GMU-20261025-0001" }), { ok: true, memberType: "기업", amount: 500000, status: "결제대기" }));
}

// 3) onEdit: 운영자가 결제여부를 바꿀 때
{
  const t = load([]);
  const { orderId } = t.post(apply);
  const row = 2;
  const edit = (col, value) => { t.grid[row - 1][col - 1] = value; t.ctx.onEdit({ range: t.sheet.getRange(row, col) }); };

  edit(9, "결제완료");
  ok("운영자가 결제완료로 변경 → 결제일시 자동 기록", () => assert.ok(isDate(t.grid[row - 1][10])));
  const first = t.grid[row - 1][10];
  edit(9, "환불"); edit(9, "결제완료");
  ok("결제일시가 이미 있으면 덮어쓰지 않음", () => assert.strictEqual(t.grid[row - 1][10], first));

  const t2 = load([]); t2.post(apply);
  t2.grid[1][8] = "결제실패"; t2.ctx.onEdit({ range: t2.sheet.getRange(2, 9) });
  ok("결제완료가 아니면 결제일시 기록 안 함", () => assert.strictEqual(t2.grid[1][10], ""));

  const t3 = load([]); t3.post(apply);
  t3.grid[1][7] = "결제완료"; t3.ctx.onEdit({ range: t3.sheet.getRange(2, 8) });
  ok("다른 열 수정은 무시", () => assert.strictEqual(t3.grid[1][10], ""));

  const t4 = load([]); t4.post(apply);
  t4.ctx.onEdit({ range: t4.sheet.getRange(1, 9) });
  ok("머리글 행 수정은 무시(오류 없음)", () => assert.strictEqual(t4.grid[0][10], "결제일시"));

  ok("mark_paid(카드 결제 확인용)는 그대로 동작", () => assert.strictEqual(t.post({ action: "mark_paid", orderId, status: "결제완료", txId: "T1" }).ok, true));
}

console.log(`\n${n} checks passed`);
