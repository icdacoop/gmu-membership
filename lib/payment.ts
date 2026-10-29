// 카드 결제(건흥페이먼츠 PG, "올고") 연동은 이 파일 한 곳에 모읍니다. 서버에서만 호출하세요.
//
// 방식: 온라인 인증 결제 "2단계 승인"
//   1. 신청 접수(/api/apply) → 접수번호(trackId)·금액 확정
//   2. 브라우저: MARU.authPay() 로 결제창을 열어 카드 인증 → 응답의 paymentToken 을 우리 서버로 전달 (components/CardPay.tsx)
//   3. 서버: /api/payment/confirm 이 시트에 저장된 금액과 대조한 뒤 confirmWithProvider() 로 PG 승인 API 호출
//      → 응답 resultCd 가 "0000" 일 때만 시트를 "결제완료"로 갱신
//   4. 브라우저를 닫아도 놓치지 않도록 PG 웹훅(/api/payment/webhook)이 결제·취소를 시트에 반영
//
// 환경변수 (모두 서버 전용, 결제키는 코드·문서에 적지 않습니다)
//   PG_PUBLIC_KEY      결제창 호출용 온라인 결제키(pk_…). 이 값이 있어야 카드 결제가 열립니다.
//   PG_SECRET_KEY      서버 호출(승인·조회)용 키. 없으면 PG_PUBLIC_KEY 를 그대로 Authorization 에 사용 (PG 문서 기준)
//   PG_ENV             "live"(운영) 또는 "sandbox"(테스트). 기본 sandbox — 실수로 실결제가 되지 않도록 운영은 명시해야 함
//   PG_API_BASE        (선택) PG API 주소 덮어쓰기. 기본: live=https://api.ghpayments.kr, sandbox=https://devapi.ghpayments.kr
//   PG_WEBHOOK_TOKEN   (선택) 웹훅 주소에 붙일 비밀 토큰(?k=…). PG 에 등록하는 NOTI 주소에 포함
//   PG_WEBHOOK_IPS     (선택) 웹훅을 보낼 수 있는 PG 서버 IP 목록(쉼표 구분)

export type PgEnv = "sandbox" | "live";

export type PgConfig = {
  publicKey: string;
  authKey: string;
  env: PgEnv;
  apiBase: string;
};

// 결제창 스크립트 주소. (테스트·운영 모두 같은 스크립트를 쓰고, 스크립트가 debugMode 로 접속처를 고릅니다)
export const PG_SCRIPT_URL = "https://api.ghpayments.kr/js/clientsideV2.js";

export function pgConfig(): PgConfig | null {
  const publicKey = process.env.PG_PUBLIC_KEY?.trim();
  if (!publicKey) return null;
  const env: PgEnv = process.env.PG_ENV?.trim() === "live" ? "live" : "sandbox";
  const authKey = process.env.PG_SECRET_KEY?.trim() || publicKey;
  const defaultBase = env === "live" ? "https://api.ghpayments.kr" : "https://devapi.ghpayments.kr";
  const apiBase = (process.env.PG_API_BASE?.trim() || defaultBase).replace(/\/+$/, "");
  return { publicKey, authKey, env, apiBase };
}

// 결제키가 설정되어 있을 때만 카드 결제를 엽니다.
export function isPaymentReady(): boolean {
  return pgConfig() !== null;
}

// 브라우저에 내려 주는 값(결제창 호출에 필요한 공개 키와 환경). 서버 호출용 비밀키는 절대 포함하지 않습니다.
export function pgPublicConfig(): { publicKey: string; env: PgEnv } | null {
  const cfg = pgConfig();
  return cfg ? { publicKey: cfg.publicKey, env: cfg.env } : null;
}

// ── PG 서버 호출 ─────────────────────────────────────────────────────────────

type PgJson = {
  result?: { resultCd?: string; resultMsg?: string; message?: string; advanceMsg?: string };
  pay?: { trxId?: string; trackId?: string; amount?: number | string; authCd?: string };
  code?: string;
  error?: string;
  message?: string;
};

async function pgRequest(cfg: PgConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<PgJson> {
  const res = await fetch(`${cfg.apiBase}${path}`, {
    method,
    headers: { Authorization: cfg.authKey, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json: PgJson = {};
  try {
    json = JSON.parse(text) as PgJson;
  } catch {
    // JSON 이 아닌 응답(오류 페이지 등)
  }
  if (!json.result && !json.pay && !json.code && !json.error && !res.ok) {
    return { code: `HTTP_${res.status}` };
  }
  return json;
}

// 응답에서 오류를 구분할 수 있는 문자열을 한데 모읍니다. (PG 문서의 TOKEN_EXPIRED 같은 코드가 어느 칸에 오는지 대비)
function codeText(json: PgJson) {
  return [json.result?.resultCd, json.result?.resultMsg, json.result?.message, json.result?.advanceMsg, json.code, json.error, json.message]
    .filter(Boolean)
    .join(" | ")
    .toUpperCase();
}

function approved(json: PgJson, orderId: string, amount: number): { ok: true; txId: string } | { ok: false; reason: string } {
  const pay = json.pay;
  const txId = pay?.trxId ? String(pay.trxId) : "";
  if (!txId) return { ok: false, reason: "approved_without_trx_id" };
  // 승인된 거래가 우리가 요청한 주문·금액과 같은지 한 번 더 확인합니다.
  if (pay?.trackId && String(pay.trackId) !== orderId) return { ok: false, reason: "track_id_mismatch" };
  if (pay?.amount !== undefined && Number(pay.amount) !== amount) return { ok: false, reason: "amount_mismatch" };
  return { ok: true, txId };
}

// 접수번호(또는 PG 거래번호)로 승인 결과를 조회해, 우리 주문·금액과 일치하는 승인 거래인지 확인합니다.
// (웹훅 수신 확인, 이미 승인된 거래 확인에 사용)
export async function verifyPayment(
  orderId: string,
  amount: number,
): Promise<{ ok: true; txId: string } | { ok: false; reason: string }> {
  const cfg = pgConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };
  let json: PgJson;
  try {
    json = await pgRequest(cfg, "GET", `/api/get/${encodeURIComponent(orderId)}`);
  } catch (err) {
    return { ok: false, reason: `network:${err instanceof Error ? err.message : "error"}` };
  }
  if (json.result?.resultCd !== "0000") return { ok: false, reason: codeText(json) || "not_approved" };
  return approved(json, orderId, amount);
}

export type ConfirmInput = {
  orderId: string;
  amount: number;
  // 브라우저가 PG 결제창에서 받은 값. 2단계 승인에서는 paymentToken 이 들어 있습니다.
  payload: Record<string, string>;
};

export type ConfirmResult =
  | { ok: true; txId: string }
  // declined: 카드사·PG 가 결제를 거절한 경우 (시트에 결제실패로 기록). 그 외 오류는 기록하지 않고 재시도하게 둡니다.
  | { ok: false; declined: boolean; reason: string };

// 결제창 응답에서 paymentToken 을 꺼냅니다. (직접 전달된 값, 또는 redirect 방식의 result JSON 안의 값)
export function extractPaymentToken(payload: Record<string, string>): string {
  let token = payload.paymentToken ?? "";
  if (!token && payload.result) {
    try {
      const parsed = JSON.parse(payload.result) as { auth?: { paymentToken?: string } };
      token = parsed.auth?.paymentToken ?? "";
    } catch {
      // 무시
    }
  }
  return /^\S{8,200}$/.test(token) ? token : "";
}

// 아직 승인되지 않았지만 곧 해결될 수 있는 상태(재시도 대상)로 보는 코드들
const RETRYABLE = /TOKEN_EXPIRED|TOKEN_NOT_FOUND|CONFIRMING|INVALID_MERCHANT|INVALID_TRACK_ID|INVALID_AMOUNT|INVALID_STATUS|HTTP_4\d\d|HTTP_5\d\d/;

export async function confirmWithProvider(input: ConfirmInput): Promise<ConfirmResult> {
  const cfg = pgConfig();
  if (!cfg) return { ok: false, declined: false, reason: "not_configured" };

  const paymentToken = extractPaymentToken(input.payload);
  if (!paymentToken) return { ok: false, declined: false, reason: "no_payment_token" };

  let json: PgJson;
  try {
    json = await pgRequest(cfg, "POST", "/api/pay/confirm", {
      confirm: { paymentToken, trackId: input.orderId, amount: input.amount },
    });
  } catch (err) {
    // 응답을 못 받았다면 승인됐을 수도 있으므로 거절로 기록하지 않습니다. (웹훅·조회로 뒤늦게 확인됨)
    return { ok: false, declined: false, reason: `network:${err instanceof Error ? err.message : "error"}` };
  }

  const resultCd = json.result?.resultCd ?? "";
  if (resultCd === "0000") {
    const a = approved(json, input.orderId, input.amount);
    return a.ok ? a : { ok: false, declined: false, reason: a.reason };
  }

  const text = codeText(json);

  // 이미 승인된 거래라면 조회로 확인해 성공으로 처리합니다. (새로고침·재시도로 두 번 호출된 경우)
  if (text.includes("ALREADY_CONFIRMED")) {
    const v = await verifyPayment(input.orderId, input.amount);
    return v.ok ? v : { ok: false, declined: false, reason: `already_confirmed_unverified:${v.reason}` };
  }

  if (RETRYABLE.test(text)) return { ok: false, declined: false, reason: text };

  // 카드사·PG 의 거절 응답(4자리 응답 코드)은 결제실패로 봅니다.
  const declined = /^\d{4}$/.test(resultCd);
  return { ok: false, declined, reason: text || "unknown_response" };
}
