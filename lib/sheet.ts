import type { ApplyInput } from "./validation";
import { MEMBER_FEES, SHEET_MEMBER_LABEL } from "./site";
import type { Locale } from "./i18n";

// 신청 정보를 구글 시트(Apps Script 웹앱)로 보냅니다. 서버에서만 호출하세요.

export type SavedApplication = { orderId: string };

export async function saveApplication(data: ApplyInput, lang: Locale): Promise<SavedApplication> {
  const url = process.env.GOOGLE_SCRIPT_URL;
  const token = process.env.APPLY_TOKEN;

  if (!url || !token) {
    // 로컬에서 화면만 확인할 때를 위한 임시 처리. 운영 환경에서는 설정 누락을 오류로 처리합니다.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sheet] GOOGLE_SCRIPT_URL / APPLY_TOKEN 이 없어 시트에 저장하지 않았습니다. (개발 모드)");
      return { orderId: `GMU-DEV-${Date.now().toString().slice(-6)}` };
    }
    throw new Error("sheet_not_configured");
  }

  const payload = {
    token,
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
  };

  const res = await fetch(url, {
    method: "POST",
    // text/plain 으로 보내면 Apps Script 가 사전 요청(preflight) 없이 받습니다.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json().catch(() => null)) as { ok?: boolean; orderId?: string; error?: string } | null;
  if (!res.ok || !json?.ok || !json.orderId) {
    throw new Error(`sheet_error:${json?.error ?? res.status}`);
  }
  return { orderId: json.orderId };
}
