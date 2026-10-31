// 30일 자동 파기(purgeUnpaid)·미리보기·트리거 설정·시험 행 삭제를 시험합니다.
const assert = require("node:assert");
const { load, HEADERS } = require("./harness.cjs");

const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(Date.now() - days * DAY - 60 * 1000);

// 한 행 만들기: 접수번호, 접수일시, 결제여부와 선택 값(결제일시·거래번호·메모·이메일·이름·기업명)
function row(id, at, status, o = {}) {
  return [id, at, o.type || "일반", o.name || "실사용자", o.company || "", "010-1111-2222", o.email || "real@example.com",
    "관심", status, 200000, o.paidAt || "", o.tx || "", "c", o.memo || "", "한국어", "계좌이체"];
}
const grid = (rows) => [HEADERS, ...rows];

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("PASS", name); };
const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

// 1) 파기 대상 판정
{
  const t = load(grid([
    row("A-대기40일", ago(40), "결제대기"),
    row("B-실패31일", ago(31), "결제실패"),
    row("C-대기29일", ago(29), "결제대기"),
    row("D-결제완료100일", ago(100), "결제완료", { paidAt: ago(99) }),
    row("E-환불100일", ago(100), "환불", { paidAt: ago(99) }),
    row("F-대기40일+보관메모", ago(40), "결제대기", { memo: "입금 예정, 보관" }),
    row("G-대기40일+결제일시있음", ago(40), "결제대기", { paidAt: ago(39) }),
    row("H-대기40일+거래번호있음", ago(40), "결제대기", { tx: "TX1" }),
    row("I-날짜읽기불가", "garbage", "결제대기"),
    row("J-날짜없음", "", "결제대기"),
    row("K-대기100일", ago(100), "결제대기"),
  ]));
  const before = t.ids().length;

  const prev = t.ctx.previewPurge();
  ok("미리보기: 대상 3건이라 알리지만 아무것도 지우지 않음", () => { assert.strictEqual(prev.count, 3); assert.strictEqual(t.ids().length, before); assert.ok(!t.sheets["파기기록"]); });

  const r = t.ctx.purgeUnpaid();
  ok("파기: 30일 넘은 결제대기·결제실패 3건(A,B,K)만 삭제", () => { assert.strictEqual(r.count, 3); same(t.ids(), ["C-대기29일", "D-결제완료100일", "E-환불100일", "F-대기40일+보관메모", "G-대기40일+결제일시있음", "H-대기40일+거래번호있음", "I-날짜읽기불가", "J-날짜없음"]); });
  ok("보존: 29일·결제완료·환불·보관메모·결제일시/거래번호 있음·날짜불명 행은 그대로", () => assert.strictEqual(t.ids().length, 8));

  const log = t.sheets["파기기록"].grid;
  ok("파기기록 시트 생성, 머리글 + 3건(접수번호·상태·날짜만)", () => { assert.strictEqual(log.length, 4); same(log[0], ["파기일시", "접수번호", "파기 당시 결제여부", "접수일시"]); same(log.slice(1).map((x) => x[1]).sort(), ["A-대기40일", "B-실패31일", "K-대기100일"]); });
  ok("파기기록에 개인정보(이름·전화·이메일) 없음", () => { const flat = JSON.stringify(log); assert.ok(!flat.includes("실사용자") && !flat.includes("010-") && !flat.includes("real@example.com")); });
  ok("운영자 알림 메일: 접수번호만 포함, 개인정보 없음", () => { assert.strictEqual(t.mails.length, 1); assert.match(t.mails[0].subj, /3건 파기/); assert.ok(!t.mails[0].text.includes("010-") && !t.mails[0].text.includes("real@example.com")); });

  const again = t.ctx.purgeUnpaid();
  ok("다시 실행해도 더 지우지 않음(멱등)", () => { assert.strictEqual(again.count, 0); assert.strictEqual(t.ids().length, 8); assert.strictEqual(t.sheets["파기기록"].grid.length, 4); assert.strictEqual(t.mails.length, 1); });
}

// 2) 연속된 행을 지워도 행 번호가 밀리지 않는지
{
  const t = load(grid([row("K1", ago(40), "결제대기"), row("K2", ago(41), "결제대기"), row("KEEP", ago(1), "결제대기"), row("K3", ago(50), "결제실패"), row("K4", ago(60), "결제대기")]));
  t.ctx.purgeUnpaid();
  ok("연속·떨어진 여러 행을 지워도 남아야 할 행(KEEP)만 정확히 남음", () => same(t.ids(), ["KEEP"]));
}

// 3) PURGE_DAYS 설정
{
  const t = load(grid([row("X40", ago(40), "결제대기"), row("X100", ago(100), "결제대기")]), { PURGE_DAYS: "60" });
  t.ctx.purgeUnpaid();
  ok("PURGE_DAYS=60 이면 40일 행은 남기고 100일 행만 삭제", () => same(t.ids(), ["X40"]));
  const t2 = load(grid([row("Y", ago(40), "결제대기")]), { PURGE_DAYS: "abc" });
  t2.ctx.purgeUnpaid();
  ok("PURGE_DAYS 가 잘못된 값이면 기본 30일로 동작", () => same(t2.ids(), []));
}

// 4) 아무것도 없을 때
{
  const t = load(grid([]));
  const r = t.ctx.purgeUnpaid();
  ok("신청이 하나도 없어도 오류 없이 0건", () => assert.strictEqual(r.count, 0));
  const t2 = load(grid([row("N1", ago(5), "결제대기")]));
  const r2 = t2.ctx.purgeUnpaid();
  ok("대상 없으면 메일·기록 없음", () => { assert.strictEqual(r2.count, 0); assert.strictEqual(t2.mails.length, 0); assert.ok(!t2.sheets["파기기록"]); });
}

// 5) 일일 트리거
{
  const t = load(grid([]));
  t.ctx.setupDailyPurge(); t.ctx.setupDailyPurge();
  ok("setupDailyPurge: purgeUnpaid 트리거 1개만(두 번 실행해도 중복 없음), 매일 3시", () => { assert.strictEqual(t.triggers.length, 1); assert.strictEqual(t.triggers[0].fn, "purgeUnpaid"); assert.strictEqual(t.triggers[0].days, 1); assert.strictEqual(t.triggers[0].hour, 3); });
}

// 6) 시험 행 삭제
{
  const t = load(grid([
    row("T1", ago(1), "결제대기", { email: "test-delete@example.com", name: "계좌이체테스트(삭제)" }),
    row("REAL1", ago(1), "결제대기"),
    row("T2", ago(1), "결제대기", { email: "TEST-DELETE@example.com", type: "기업", name: "대표", company: "테스트기업(삭제)" }),
    row("SAME_EMAIL_REAL", ago(1), "결제대기", { email: "test-delete@example.com", name: "진짜사람" }),
    row("DELETE_WORD_ONLY", ago(1), "결제대기", { name: "홍길동(삭제)" }),
    row("PAID", ago(1), "결제완료", { paidAt: ago(0) }),
  ]));
  const r = t.ctx.deleteTestRows();
  ok("deleteTestRows: 이메일+(삭제) 조건을 모두 만족하는 2건(T1,T2)만 삭제", () => { assert.strictEqual(r.count, 2); same(t.ids(), ["REAL1", "SAME_EMAIL_REAL", "DELETE_WORD_ONLY", "PAID"]); });
}

console.log(`\n${n} checks passed`);
