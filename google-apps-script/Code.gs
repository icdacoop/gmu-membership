/**
 * 글로벌미디어연합(GMU) 회원 신청 → 구글 스프레드시트 저장용 Apps Script
 *
 * 설정 방법은 같은 폴더의 README.md 를 참고하세요.
 * 스크립트 속성(프로젝트 설정 → 스크립트 속성)에 아래 값을 등록해야 합니다.
 *   APPLY_TOKEN  : 웹사이트의 .env.local 에 있는 APPLY_TOKEN 과 동일한 값 (필수)
 *   NOTIFY_EMAIL : 새 신청이 올 때 알림을 받을 이메일 (선택)
 *
 * 기능
 *   - action 없음 / "apply" : 신청 저장 (접수번호를 만들어 돌려줌, 결제여부는 "결제대기")
 *   - action "get_order"    : 접수번호로 회원구분·금액·결제여부 조회 (결제 확인 때 금액 대조용)
 *   - action "mark_paid"    : 접수번호로 행을 찾아 결제 결과 갱신 (카드 결제 연동 후 사용)
 *
 * 계좌이체(무통장입금) 확인 방법 (운영자)
 *   입금을 확인하면 시트에서 해당 행의 "결제여부" 칸(I열)을 드롭다운에서 "결제완료"로 바꿉니다.
 *   → 아래 onEdit 이 "결제일시"(K열)를 자동으로 채웁니다.
 *
 * 열 순서 (열을 삭제하지 마세요. 보기 싫으면 숨기기를 사용하세요)
 *   A 접수번호 | B 접수일시 | C 회원구분 | D 성명 | E 기업명 | F 전화번호 | G 이메일 |
 *   H 관심분야 | I 결제여부 | J 결제금액 | K 결제일시 | L 거래번호 | M 개인정보동의 | N 메모 |
 *   O 신청언어(한국어/English) | P 결제수단(계좌이체/카드)
 */

var SHEET_NAME = '신청내역';
var HEADERS = [
  '접수번호', '접수일시', '회원구분', '성명', '기업명', '전화번호', '이메일',
  '관심분야', '결제여부', '결제금액', '결제일시', '거래번호', '개인정보동의', '메모', '신청언어', '결제수단'
];
var PAY_STATUSES = ['결제대기', '결제완료', '결제실패', '환불'];

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('APPLY_TOKEN');

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond_({ ok: false, error: 'bad_request' });
  }

  if (!expected || body.token !== expected) {
    return respond_({ ok: false, error: 'unauthorized' });
  }

  if (!body.action || body.action === 'apply') return respond_(apply_(body, props));
  if (body.action === 'get_order') return respond_(getOrder_(body));
  if (body.action === 'mark_paid') return respond_(markPaid_(body));
  return respond_({ ok: false, error: 'unknown_action' });
}

// 접수번호로 신청 정보 조회: 결제 확인 때 서버가 "저장된 금액"과 대조하기 위해 씁니다.
function getOrder_(body) {
  var sheet = getSheet_();
  var row = findRow_(sheet, String(body.orderId || ''));
  if (!row) return { ok: false, error: 'order_not_found' };
  var v = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  return { ok: true, memberType: String(v[2]), amount: Number(v[9]) || 0, status: String(v[8]) };
}

// 신청 저장
function apply_(body, props) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  var orderId;
  try {
    var sheet = getSheet_();
    var now = new Date();
    orderId = nextOrderId_(sheet, now);

    sheet.appendRow([
      orderId,
      now,
      safe_(body.member_type),
      safe_(body.name),
      safe_(body.company_name),
      safe_(body.phone),
      safe_(body.email),
      safe_(body.interest),
      '결제대기',
      Number(body.amount) || 0,
      '',
      '',
      safe_(body.consent_at),
      '',
      safe_(body.lang),
      safe_(body.payment_method)
    ]);
  } finally {
    lock.releaseLock();
  }

  var notify = props.getProperty('NOTIFY_EMAIL');
  if (notify) {
    try {
      var text =
        '접수번호: ' + orderId + '\n' +
        '회원구분: ' + safe_(body.member_type) + '\n' +
        '성명(대표자): ' + safe_(body.name) + '\n' +
        '기업명: ' + safe_(body.company_name) + '\n' +
        '전화번호: ' + safe_(body.phone) + '\n' +
        '이메일: ' + safe_(body.email) + '\n' +
        '관심분야: ' + safe_(body.interest) + '\n' +
        '결제수단: ' + safe_(body.payment_method) + '\n' +
        '결제금액: ' + (Number(body.amount) || 0) + '\n' +
        '신청언어: ' + safe_(body.lang);
      MailApp.sendEmail(notify, '[GMU] 새 회원 신청: ' + orderId, text);
    } catch (err) {
      // 메일 발송이 실패해도 신청 저장은 성공으로 처리
    }
  }

  return { ok: true, orderId: orderId };
}

// 결제 결과 갱신: 접수번호로 행을 찾아 결제여부·결제일시·거래번호를 바꿉니다.
function markPaid_(body) {
  var status = String(body.status || '');
  if (PAY_STATUSES.indexOf(status) === -1) return { ok: false, error: 'bad_status' };

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet_();
    var row = findRow_(sheet, String(body.orderId || ''));
    if (!row) return { ok: false, error: 'order_not_found' };

    // 이미 결제완료인 건은 되돌리지 않습니다. (환불 처리는 status "환불" 로만 가능)
    var current = sheet.getRange(row, 9).getValue();
    if (current === '결제완료' && status !== '환불') return { ok: true, already: true };

    sheet.getRange(row, 9).setValue(status);
    if (status === '결제완료') {
      sheet.getRange(row, 11).setValue(new Date());
      sheet.getRange(row, 12).setValue(safe_(body.txId));
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    // 전화번호·접수번호·거래번호는 문자열로 (앞자리 0, 하이픈 보존)
    sheet.getRange('A:A').setNumberFormat('@');
    sheet.getRange('F:F').setNumberFormat('@');
    sheet.getRange('L:L').setNumberFormat('@');
    applyPayStatusValidation_(sheet);
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // 예전 버전으로 만든 시트: 새 열의 머리글만 맨 뒤에 채웁니다. (기존 데이터는 그대로)
    var from = sheet.getLastColumn();
    sheet.getRange(1, from + 1, 1, HEADERS.length - from).setValues([HEADERS.slice(from)]);
    applyPayStatusValidation_(sheet);
  }
  return sheet;
}

// "결제여부" 칸(I열)에 드롭다운을 걸어 운영자가 오타 없이 고르게 합니다.
function applyPayStatusValidation_(sheet) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAY_STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 9, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

// 직접 실행용: 이미 만들어 둔 시트에 드롭다운·머리글을 다시 맞추고 싶을 때 한 번 실행합니다.
function setupSheet() {
  applyPayStatusValidation_(getSheet_());
}

// 운영자가 시트에서 "결제여부"를 "결제완료"로 바꾸면 "결제일시"를 자동으로 기록합니다.
// (시트에 묶인 스크립트에서는 onEdit 이 설치 없이 자동으로 동작합니다. 스크립트가 값을 쓸 때는 동작하지 않습니다.)
function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    if (range.getColumn() !== 9 || range.getRow() < 2 || range.getNumRows() !== 1) return;
    if (String(range.getValue()) !== '결제완료') return;
    var paidAt = sheet.getRange(range.getRow(), 11);
    if (!paidAt.getValue()) paidAt.setValue(new Date());
  } catch (err) {
    // 기록에 실패해도 운영자의 수정은 그대로 둡니다.
  }
}

// GMU-20261101-0001 형식. 같은 날짜의 가장 큰 번호 + 1
function nextOrderId_(sheet, now) {
  var day = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
  var prefix = 'GMU-' + day + '-';
  var last = sheet.getLastRow();
  var max = 0;
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]);
      if (id.indexOf(prefix) === 0) {
        var n = Number(id.slice(prefix.length));
        if (n > max) max = n;
      }
    }
  }
  return prefix + ('0000' + (max + 1)).slice(-4);
}

function findRow_(sheet, orderId) {
  if (!orderId) return 0;
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === orderId) return i + 2;
  }
  return 0;
}

// 시트 수식 주입 방지: = + - @ 로 시작하는 값은 앞에 작은따옴표를 붙여 일반 텍스트로 저장
function safe_(value) {
  var s = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
