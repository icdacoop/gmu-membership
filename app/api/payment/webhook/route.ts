import { timingSafeEqual } from "node:crypto";
import { isPaymentReady, verifyPayment } from "@/lib/payment";
import { clientIp } from "@/lib/rateLimit";
import { getOrder, markPayment } from "@/lib/sheet";
import { MEMBER_FEES, SHEET_MEMBER_LABEL } from "@/lib/site";

// PG(NOTI) 결제·취소 알림 수신. 브라우저를 닫아 승인 확인을 못 받은 결제를 시트에 반영하고,
// PG 관리자에서 한 취소를 시트의 "환불"로 반영합니다.
//
// PG 규격: POST(form-urlencoded, UTF-8). 처리가 끝나면 본문에 정확히 "OK"만, HTTP 200 으로 응답해야 합니다.
//   (OK 가 아니면 2분 간격으로 최대 10회 재전송 → 일시적 오류에는 500 으로 응답해 재전송을 받습니다)
//
// 보안: 알림에는 서명이 없습니다. 그래서
//   - PG_WEBHOOK_TOKEN 이 있으면 주소의 ?k= 값이 같아야 하고, PG_WEBHOOK_IPS 가 있으면 발송 IP 가 목록에 있어야 합니다.
//   - 결제(PAY) 알림은 내용을 믿지 않고 PG 조회 API 로 다시 확인한 뒤에만 시트에 반영합니다.
//   - 취소(REFUND) 알림은 조회로 확인할 수 없으므로 토큰 또는 IP 허용 목록이 설정된 경우에만 반영합니다.

const OK = () => new Response("OK", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const RETRY = () => new Response("RETRY", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const DENY = () => new Response("FORBIDDEN", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function readFields(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const fields: Record<string, string> = {};
  if (text.trim().startsWith("{")) {
    try {
      for (const [k, v] of Object.entries(JSON.parse(text) as Record<string, unknown>)) fields[k] = String(v ?? "");
    } catch {
      // 무시
    }
    return fields;
  }
  for (const [k, v] of new URLSearchParams(text)) fields[k] = v;
  return fields;
}

export async function POST(request: Request) {
  const token = process.env.PG_WEBHOOK_TOKEN?.trim();
  const ips = (process.env.PG_WEBHOOK_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasStrongAuth = Boolean(token) || ips.length > 0;

  if (token) {
    const given = new URL(request.url).searchParams.get("k") ?? "";
    if (!safeEqual(given, token)) return DENY();
  }
  if (ips.length > 0 && !ips.includes(clientIp(request))) return DENY();

  // 결제키가 아직 없으면(카드 결제 미개통) 처리하지 않습니다.
  if (!isPaymentReady()) return RETRY();

  const f = await readFields(request);
  const trxType = (f.trxType ?? "").toUpperCase();
  const trackId = (f.trackId ?? "").trim();
  const amount = Number(f.amount);

  // 우리 접수번호가 아니면 더 처리할 것이 없으므로 받았다고만 응답해 재전송을 멈춥니다.
  if (!/^GMU-[A-Z0-9-]{3,30}$/.test(trackId) || !Number.isFinite(amount)) return OK();

  try {
    const order = await getOrder(trackId);
    if (!order) {
      console.error("[webhook] 시트에 없는 접수번호", trackId);
      return OK();
    }

    if (trxType === "PAY") {
      if (order.status === "결제완료") return OK(); // 이미 반영됨 (승인 확인 API 가 먼저 처리)

      const memberType = order.memberType === SHEET_MEMBER_LABEL.corporate ? "corporate" : "individual";
      if (order.amount !== MEMBER_FEES[memberType] || amount !== order.amount) {
        console.error("[webhook] 금액 불일치 — 시트에 반영하지 않음", trackId, amount, order.amount);
        return OK();
      }

      // 알림 내용을 믿지 않고 PG 에 다시 조회해 승인 거래인지 확인합니다.
      const v = await verifyPayment(trackId, order.amount);
      if (!v.ok) {
        // 조회 자체를 못 한 경우는 재전송을 받고, PG 가 승인 거래가 아니라고 답한 경우는 반영하지 않습니다.
        if (v.reason.startsWith("network") || v.reason.startsWith("HTTP_5")) return RETRY();
        console.error("[webhook] PG 조회로 승인 확인 실패 — 반영하지 않음", trackId, v.reason);
        return OK();
      }
      await markPayment(trackId, "결제완료", v.txId);
      return OK();
    }

    if (trxType === "REFUND") {
      if (!hasStrongAuth) {
        console.error("[webhook] 취소 알림 무시: PG_WEBHOOK_TOKEN 또는 PG_WEBHOOK_IPS 가 설정되어 있지 않음", trackId);
        return OK();
      }
      if (order.status === "환불") return OK();
      if (order.status === "결제완료" && amount === order.amount) {
        await markPayment(trackId, "환불");
      } else {
        // 부분 취소이거나 결제완료가 아닌 건은 자동으로 바꾸지 않습니다. 운영자가 시트에서 직접 확인하세요.
        console.error("[webhook] 취소 알림 자동 반영 안 함(부분 취소 또는 상태 불일치)", trackId, amount, order.status);
      }
      return OK();
    }

    return OK(); // 알 수 없는 거래구분
  } catch (err) {
    console.error("[webhook] 처리 중 오류 — 재전송 요청", trackId, err);
    return RETRY();
  }
}
