import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, getDict, isLocale } from "@/lib/i18n";
import { confirmWithProvider, isPaymentReady } from "@/lib/payment";
import { clientIp, tooMany } from "@/lib/rateLimit";
import { getOrder, markPayment } from "@/lib/sheet";
import { MEMBER_FEES, SHEET_MEMBER_LABEL } from "@/lib/site";

// 카드 인증이 끝난 뒤 브라우저가 호출합니다. "결제완료"는 이 API 가 PG 에 승인을 요청해 성공한 뒤에만 시트에 기록합니다.
// (브라우저가 보낸 금액·결과를 믿지 않고, 시트에 저장된 금액과 서버 설정 금액으로 대조합니다.)
export async function POST(request: Request) {
  let body: { orderId?: unknown; amount?: unknown; payload?: unknown; lang?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    // 아래에서 처리
  }

  const lang = isLocale(body?.lang) ? body.lang : DEFAULT_LOCALE;
  const dict = getDict(lang);

  // 같은 IP 에서 10분에 20번까지만 (결제 재시도를 감안한 넉넉한 값)
  if (tooMany("confirm", clientIp(request), 20, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: dict.api.tooMany }, { status: 429 });
  }

  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const amount = Number(body?.amount);
  const payload: Record<string, string> = {};
  if (body?.payload && typeof body.payload === "object") {
    for (const [k, v] of Object.entries(body.payload)) {
      if (typeof v === "string" && k.length <= 50 && v.length <= 4000) payload[k] = v;
    }
  }

  if (!/^GMU-[A-Z0-9-]{3,30}$/.test(orderId) || !Number.isFinite(amount)) {
    return NextResponse.json({ ok: false, error: dict.api.badRequest }, { status: 400 });
  }

  if (!isPaymentReady()) {
    return NextResponse.json({ ok: false, error: dict.api.paymentNotReady }, { status: 503 });
  }

  try {
    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ ok: false, error: dict.api.orderNotFound }, { status: 404 });

    // 새로고침 등으로 다시 호출돼도 PG 승인을 두 번 하지 않습니다.
    if (order.status === "결제완료") return NextResponse.json({ ok: true, orderId, already: true });

    // 환불 처리된 건 등은 다시 승인하지 않습니다.
    if (order.status !== "결제대기" && order.status !== "결제실패") {
      return NextResponse.json({ ok: false, error: dict.api.badRequest }, { status: 409 });
    }

    const memberType = order.memberType === SHEET_MEMBER_LABEL.corporate ? "corporate" : "individual";
    if (order.amount !== MEMBER_FEES[memberType] || amount !== order.amount) {
      return NextResponse.json({ ok: false, error: dict.api.amountMismatch }, { status: 400 });
    }

    const result = await confirmWithProvider({ orderId, amount: order.amount, payload });
    if (!result.ok) {
      if (result.declined) await markPayment(orderId, "결제실패");
      console.error("[payment] 승인 실패", orderId, result.reason);
      return NextResponse.json({ ok: false, declined: result.declined, error: dict.api.confirmFailed }, { status: 502 });
    }

    // 승인은 성공했는데 시트 기록이 실패하면 오류로 응답하지만, PG 웹훅이 다시 시트에 반영합니다.
    await markPayment(orderId, "결제완료", result.txId);
    return NextResponse.json({ ok: true, orderId, trxId: result.txId });
  } catch (err) {
    console.error("[payment] 확인 중 오류", orderId, err);
    return NextResponse.json({ ok: false, error: dict.api.confirmFailed }, { status: 500 });
  }
}
