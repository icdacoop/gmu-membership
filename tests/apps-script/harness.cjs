// Apps Script(google-apps-script/Code.gs)를 가짜 스프레드시트 위에서 실행하는 시험용 환경입니다.
// 실제 구글 시트·메일에는 아무것도 보내지 않습니다. (Node 의 vm 안에서 SpreadsheetApp 등을 흉내 냄)
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const CODE = fs.readFileSync(path.join(__dirname, "..", "..", "google-apps-script", "Code.gs"), "utf8");

const SHEET_NAME = "신청내역";
const HEADERS = [
  "접수번호", "접수일시", "회원구분", "성명", "기업명", "전화번호", "이메일", "관심분야",
  "결제여부", "결제금액", "결제일시", "거래번호", "개인정보동의", "메모", "신청언어", "결제수단",
];

function makeSheet(name, initialRows) {
  const grid = initialRows.map((r) => r.slice());
  const validations = [];
  const width = () => grid.reduce((m, r) => Math.max(m, r.length), 0);
  const cell = (r, c) => (grid[r - 1] && grid[r - 1][c - 1] !== undefined ? grid[r - 1][c - 1] : "");
  const put = (r, c, v) => {
    while (grid.length < r) grid.push([]);
    while (grid[r - 1].length < c) grid[r - 1].push("");
    grid[r - 1][c - 1] = v;
  };
  const sheet = {
    grid,
    validations,
    getName: () => name,
    getLastRow: () => grid.length,
    getLastColumn: () => width(),
    getMaxRows: () => Math.max(grid.length, 1000),
    appendRow: (arr) => { grid.push(arr.slice()); },
    deleteRow: (n) => { grid.splice(n - 1, 1); },
    setFrozenRows() {},
    getRange(a, b, c, d) {
      if (typeof a === "string") return { setNumberFormat() {} }; // 'A:A' 같은 열 서식
      const rows = c || 1, cols = d || 1;
      return {
        getRow: () => a, getColumn: () => b, getNumRows: () => rows, getSheet: () => sheet,
        getValue: () => cell(a, b),
        getValues: () => Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => cell(a + i, b + j))),
        setValue: (v) => { put(a, b, v); },
        setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => put(a + i, b + j, v))); },
        setNumberFormat: () => ({ setValue: (v) => put(a, b, v) }),
        setDataValidation: (rule) => { validations.push({ col: b, list: rule.list, allowInvalid: rule.allowInvalid }); },
      };
    },
  };
  return sheet;
}

// initialGrid: 시작 시트의 모든 행(머리글 포함). 빈 배열이면 "시트가 막 만들어진 상태"
// props: 스크립트 속성 덮어쓰기 (예: { PURGE_DAYS: "60" })
function load(initialGrid, props = {}) {
  const sheets = { [SHEET_NAME]: makeSheet(SHEET_NAME, initialGrid) };
  const mails = [], logs = [], triggers = [];
  const ctx = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = makeSheet(n, [])),
      }),
      newDataValidation: () => {
        const r = {};
        const b = { requireValueInList: (l) => { r.list = l; return b; }, setAllowInvalid: (v) => { r.allowInvalid = v; return b; }, build: () => r };
        return b;
      },
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ APPLY_TOKEN: "t", NOTIFY_EMAIL: "ops@example.com", ...props })[k] }) },
    Utilities: { formatDate: () => "20261101" },
    ContentService: { createTextOutput: (s) => ({ s, setMimeType() { return this; } }), MimeType: { JSON: "json" } },
    MailApp: { sendEmail: (to, subj, text) => mails.push({ to, subj, text }) },
    Logger: { log: (...a) => logs.push(a.join(" ")) },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: (fn) => {
        const t = { fn, getHandlerFunction: () => fn };
        const b = { timeBased: () => b, everyDays: (n) => { t.days = n; return b; }, atHour: (h) => { t.hour = h; return b; }, create: () => { triggers.push(t); return t; } };
        return b;
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);

  const main = sheets[SHEET_NAME];
  return {
    ctx, sheets, sheet: main, grid: main.grid, mails, logs, triggers,
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token: "t", ...body }) } }).s),
    ids: () => main.grid.slice(1).map((r) => r[0]),
  };
}

module.exports = { load, HEADERS, SHEET_NAME };
