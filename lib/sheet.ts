import type { ApplyInput } from "./validation";
import { MEMBER_FEES, SHEET_MEMBER_LABEL } from "./site";
import type { Locale } from "./i18n";

// 구글 시트(Apps Script 웹앱)와 주고받습니다. 서버에서만 호출하세요.

export type SavedApplication = { orderId: string };
export type PayStatus = "결제대기" | "결제완료" | "결제실패" | "환불";
export type OrderInfo = { memberType: string; amount: number; status: string };

function config() {
  const url = process.env.GOOGLE_SCRIPT_URL;
  const token = process.env.APPLY_TOKEN;
  return url && token ? { url, token } : null;
}

async function callScript<T>(cfg: { url: string; token: string }, payload: Record<string, unknown>) {
  const res = await fetch(cfg.url, {
    method: "POST",
    // text/plain 으로 보내면 Apps Script 가 사전 요청(preflight) 없이 받습니다.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: cfg.token, ...payload }),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
  if (!res.ok || !json?.ok) throw new Error(`sheet_error:${json?.error ?? res.status}`);
  return json;
}

export async function saveApplication(data: ApplyInput, lang: Locale): Promise<SavedApplication> {
  const cfg = config();

  if (!cfg) {
    // 로컬에서 화면만 확인할 때를 위한 임시 처리. 운영 환경에서는 설정 누락을 오류로 처리합니다.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sheet] GOOGLE_SCRIPT_URL / APPLY_TOKEN 이 없어 시트에 저장하지 않았습니다. (개발 모드)");
      return { orderId: `GMU-DEV-${Date.now().toString().slice(-6)}` };
    }
    throw new Error("sheet_not_configured");
  }

  const json = await callScript<{ orderId?: string }>(cfg, {
    action: "apply",
    member_type: SHEET_MEMBER_LABEL[data.memberType],
    name: data.memberType === "individual" ? data.name : data.ceoName,
    company_name: data.memberType === "corporate" ? data.companyName : "",
    phone: data.phone,
    email: data.email,
    interest: data.interest,
    amount: MEMBER_FEES[data.memberType],
    consent_at: new Date().toISOString(),
    // 영어로 신청한 사람에게는 영어로 연락할 수 있도록 신청 언어도 기록합니다.
    lang: lang === "en" ? "English" : "한국어",
  });
  if (!json.orderId) throw new Error("sheet_error:no_order_id");
  return { orderId: json.orderId };
}

// 접수번호로 저장된 신청 정보를 조회합니다. 없으면 null.
export async function getOrder(orderId: string): Promise<OrderInfo | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const json = await callScript<OrderInfo>(cfg, { action: "get_order", orderId });
    return { memberType: json.memberType, amount: json.amount, status: json.status };
  } catch (err) {
    if (err instanceof Error && err.message === "sheet_error:order_not_found") return null;
    throw err;
  }
}

// 결제 결과를 시트에 기록합니다. (이미 결제완료인 건은 스크립트가 되돌리지 않습니다)
export async function markPayment(orderId: string, status: PayStatus, txId?: string) {
  const cfg = config();
  if (!cfg) throw new Error("sheet_not_configured");
  await callScript(cfg, { action: "mark_paid", orderId, status, txId: txId ?? "" });
}
