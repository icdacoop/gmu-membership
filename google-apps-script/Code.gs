/**
 * 글로벌미디어연합(GMU) 회원 신청 → 구글 스프레드시트 저장용 Apps Script
 *
 * 설정 방법은 같은 폴더의 README.md 를 참고하세요.
 * 스크립트 속성(프로젝트 설정 → 스크립트 속성)에 아래 값을 등록해야 합니다.
 *   APPLY_TOKEN  : 웹사이트의 .env.local 에 있는 APPLY_TOKEN 과 동일한 값 (필수)
 *   NOTIFY_EMAIL : 새 신청이 올 때 알림을 받을 이메일 (선택)
 *   PURGE_DAYS   : 결제 미완료 신청을 파기하기까지의 일수 (선택, 없으면 30)
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
 * 결제 미완료 신청 자동 파기 (개인정보처리방침: 접수일로부터 30일 후 파기)
 *   - purgeUnpaid()      : 접수 후 30일이 지난 "결제대기"·"결제실패" 행을 삭제하고 "파기기록" 시트에 접수번호만 남김
 *   - previewPurge()     : 실제로 지우지 않고 지워질 행만 실행 로그에 보여 줌 (먼저 확인용)
 *   - setupDailyPurge()  : purgeUnpaid 를 매일 새벽 3시에 자동 실행하도록 한 번만 설정
 *   - deleteTestRows()   : 시험 신청(이메일 test-delete@example.com 이고 이름·기업명에 "(삭제)" 포함)만 삭제
 *   결제완료·환불 행, 결제일시·거래번호가 있는 행, 메모(N열)에 "보관"이 적힌 행은 절대 지우지 않습니다.
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

// ─────────────────────────────────────────────────────────────────────────────
// 결제 미완료 신청 자동 파기
// ─────────────────────────────────────────────────────────────────────────────

var PURGE_STATUSES = ['결제대기', '결제실패'];
var PURGE_LOG_SHEET = '파기기록';
var TEST_EMAIL = 'test-delete@example.com';

function purgeDays_() {
  var n = Number(PropertiesService.getScriptProperties().getProperty('PURGE_DAYS'));
  return n >= 1 ? n : 30;
}

// 파기 대상 행을 찾습니다. 조금이라도 애매하면 지우지 않는 쪽으로 판단합니다.
function findPurgeRows_(sheet, now, days) {
  var last = sheet.getLastRow();
  var rows = [];
  if (last < 2) return rows;
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    var status = String(v[8]);
    if (PURGE_STATUSES.indexOf(status) === -1) continue;   // 결제완료·환불 등은 법정 보관 대상이라 제외
    if (v[10] || v[11]) continue;                          // 결제일시·거래번호가 있으면 결제된 건일 수 있어 제외
    if (String(v[13]).indexOf('보관') !== -1) continue;     // 운영자가 메모에 "보관"을 적은 행은 제외
    var at = Object.prototype.toString.call(v[1]) === '[object Date]' ? v[1] : new Date(v[1]);
    var t = at.getTime();
    if (!t || isNaN(t)) continue;                          // 접수일시를 읽을 수 없으면 제외
    if (t > cutoff) continue;                              // 아직 기한 전
    rows.push({ row: i + 2, orderId: String(v[0]), status: status, at: at });
  }
  return rows;
}

function getPurgeLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(PURGE_LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(PURGE_LOG_SHEET);
    // 개인정보는 남기지 않고 접수번호·상태·날짜만 기록합니다.
    log.appendRow(['파기일시', '접수번호', '파기 당시 결제여부', '접수일시']);
    log.setFrozenRows(1);
  }
  return log;
}

function runPurge_(dryRun) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var targets;
  var now = new Date();
  var days = purgeDays_();
  try {
    var sheet = getSheet_();
    targets = findPurgeRows_(sheet, now, days);
    if (dryRun) {
      Logger.log('[미리보기] %s일 경과 결제 미완료 신청 %s건 (실제로 지우지 않았습니다): %s',
        days, targets.length, targets.map(function (t) { return t.orderId; }).join(', '));
      return { ok: true, dryRun: true, count: targets.length };
    }
    if (!targets.length) {
      Logger.log('파기 대상 없음 (%s일 경과 결제 미완료 신청 0건)', days);
      return { ok: true, count: 0 };
    }

    // 아래 행부터 지워야 위쪽 행 번호가 밀리지 않습니다.
    targets.sort(function (a, b) { return b.row - a.row; });
    var log = getPurgeLogSheet_();
    for (var i = 0; i < targets.length; i++) {
      sheet.deleteRow(targets[i].row);
      log.appendRow([now, targets[i].orderId, targets[i].status, targets[i].at]);
    }
    Logger.log('%s일 경과 결제 미완료 신청 %s건을 파기했습니다: %s',
      days, targets.length, targets.map(function (t) { return t.orderId; }).join(', '));
  } finally {
    lock.releaseLock();
  }

  var notify = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (notify) {
    try {
      MailApp.sendEmail(notify, '[GMU] 결제 미완료 신청 ' + targets.length + '건 파기 (' + days + '일 경과)',
        '개인정보처리방침에 따라 접수 후 ' + days + '일이 지나도록 결제가 완료되지 않은 신청 ' + targets.length +
        '건을 시트에서 삭제했습니다.\n접수번호: ' + targets.map(function (t) { return t.orderId; }).join(', ') +
        '\n(삭제 기록은 "' + PURGE_LOG_SHEET + '" 시트에 접수번호만 남겨 두었습니다.)');
    } catch (err) {
      // 메일 발송이 실패해도 파기 결과는 그대로 둡니다.
    }
  }
  return { ok: true, count: targets.length };
}

// 매일 자동 실행되는 파기 작업 (setupDailyPurge 로 한 번 설정하면 됩니다)
function purgeUnpaid() {
  return runPurge_(false);
}

// 지우지 않고 대상만 확인: Apps Script 편집기에서 실행한 뒤 "실행 로그"를 보세요.
function previewPurge() {
  return runPurge_(true);
}

// 한 번만 실행: purgeUnpaid 를 매일 새벽 3시(스크립트 시간대 기준)에 자동 실행하도록 등록합니다.
// 이미 등록된 같은 작업이 있으면 지우고 다시 하나만 만듭니다.
function setupDailyPurge() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'purgeUnpaid') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('purgeUnpaid').timeBased().everyDays(1).atHour(3).create();
  Logger.log('매일 새벽 3시에 purgeUnpaid 가 자동 실행되도록 설정했습니다.');
}

// 시험 신청만 삭제: 이메일이 test-delete@example.com 이고 이름 또는 기업명에 "(삭제)"가 들어 있는 행.
// 실제 신청자의 행은 이 조건에 맞지 않아 지워지지 않습니다.
function deleteTestRows() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_();
    var last = sheet.getLastRow();
    var deleted = [];
    if (last >= 2) {
      var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
      for (var i = values.length - 1; i >= 0; i--) {   // 아래 행부터 삭제
        var v = values[i];
        var isTest = String(v[6]).toLowerCase() === TEST_EMAIL &&
          (String(v[3]).indexOf('(삭제)') !== -1 || String(v[4]).indexOf('(삭제)') !== -1);
        if (isTest) {
          sheet.deleteRow(i + 2);
          deleted.push(String(v[0]));
        }
      }
    }
    Logger.log('시험 신청 %s건을 삭제했습니다: %s', deleted.length, deleted.join(', '));
    return { ok: true, count: deleted.length };
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
