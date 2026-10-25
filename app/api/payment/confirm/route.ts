import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, getDict, isLocale } from "@/lib/i18n";
import { confirmWithProvider, isPaymentReady } from "@/lib/payment";
import { getOrder, markPayment } from "@/lib/sheet";
import { MEMBER_FEES, SHEET_MEMBER_LABEL } from "@/lib/site";

// 결제 성공 후 호출됩니다. "결제완료"는 이 API 가 PG 에 확인한 뒤에만 시트에 기록합니다.
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

  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const amount = Number(body?.amount);
  const payload: Record<string, string> = {};
  if (body?.payload && typeof body.payload === "object") {
    for (const [k, v] of Object.entries(body.payload)) {
      if (typeof v === "string" && k.length <= 50 && v.length <= 2000) payload[k] = v;
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

    await markPayment(orderId, "결제완료", result.txId);
    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    console.error("[payment] 확인 중 오류", orderId, err);
    return NextResponse.json({ ok: false, error: dict.api.confirmFailed }, { status: 500 });
  }
}
