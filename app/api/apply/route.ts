import { NextResponse } from "next/server";
import { validateApplication } from "@/lib/validation";
import { saveApplication } from "@/lib/sheet";
import { MEMBER_FEES } from "@/lib/site";
import { isPaymentReady, pgPublicConfig } from "@/lib/payment";
import { clientIp, tooMany } from "@/lib/rateLimit";
import { DEFAULT_LOCALE, getDict, isLocale } from "@/lib/i18n";
import { getBankInfo } from "@/lib/bank";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: getDict(DEFAULT_LOCALE).api.badRequest }, { status: 400 });
  }

  // 화면 언어(요청의 lang)에 맞춰 오류 문구를 돌려줍니다.
  const requested = (raw as { lang?: unknown } | null)?.lang;
  const lang = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const dict = getDict(lang);

  // 같은 IP 에서 10분에 5번까지만 접수합니다.
  if (tooMany("apply", clientIp(request), 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: dict.api.tooMany }, { status: 429 });
  }

  const result = validateApplication(raw, dict.validation);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: dict.validation.invalid, errors: result.errors }, { status: 400 });
  }

  // 숨김 칸(허니팟)이 채워져 있으면 봇으로 보고, 성공한 것처럼 응답만 하고 저장하지 않습니다.
  if (result.data.website) {
    return NextResponse.json({ ok: true, orderId: "GMU-0000", amount: 0, paymentReady: false, paymentMethod: "bank", bank: null, pg: null, depositor: "" });
  }

  // 카드 결제가 아직 열리지 않았다면 카드 선택은 접수하지 않습니다.
  if (result.data.paymentMethod === "card" && !isPaymentReady()) {
    return NextResponse.json({ ok: false, error: dict.api.cardNotReady }, { status: 400 });
  }

  try {
    const { orderId } = await saveApplication(result.data, lang);
    // 금액은 항상 서버의 회원구분별 설정값을 사용합니다.
    const amount = MEMBER_FEES[result.data.memberType];
    const paymentMethod = result.data.paymentMethod;
    // 입금자명 안내: 일반회원은 성명, 기업회원은 기업명
    const depositor = result.data.memberType === "individual" ? result.data.name : result.data.companyName;
    return NextResponse.json({
      ok: true,
      orderId,
      amount,
      paymentReady: isPaymentReady(),
      paymentMethod,
      bank: paymentMethod === "bank" ? getBankInfo() : null,
      // 카드 결제창 호출에 필요한 공개 값(결제키·환경). 서버 호출용 비밀키는 포함하지 않음
      pg: paymentMethod === "card" ? pgPublicConfig() : null,
      depositor,
    });
  } catch (err) {
    console.error("[apply] 저장 실패", err);
    return NextResponse.json({ ok: false, error: dict.api.saveFailed }, { status: 500 });
  }
}
