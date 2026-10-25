// 결제(올고 PG) 연동은 이 파일 한 곳에 모읍니다.
//
// 흐름 (PG 와 무관한 부분은 이미 구현되어 있습니다)
//   1. 신청 접수(/api/apply) → 접수번호·금액을 화면에 보여주고 결제창 호출      ← 화면 쪽 연결: ApplyForm 의 결제 버튼 (TODO)
//   2. 결제 성공 시 PG 가 돌려보낸 값을 /[lang]/payment/success 가 받아 /api/payment/confirm 으로 전달
//   3. /api/payment/confirm: 시트에 저장된 금액과 대조 → confirmWithProvider() → 시트를 "결제완료"로 갱신
//   4. 결제 실패·취소 시 /[lang]/payment/fail 로 돌아옴
//
// 올고에서 연동 가이드·상점 키를 받으면 아래 두 곳만 채우면 됩니다.
//   - isPaymentReady()      : true 로 변경
//   - confirmWithProvider() : 올고 승인(검증) API 호출 구현 (환경변수 PG_MERCHANT_ID, PG_SECRET_KEY 사용 예정)

export function isPaymentReady(): boolean {
  // TODO: 올고 연동 구현 후 true 로 변경
  return false;
}

export type ConfirmInput = {
  orderId: string;
  amount: number;
  // PG 가 결제 성공 후 돌려보낸 값(쿼리스트링)을 그대로 전달. 어떤 값이 오는지는 올고 사양에 따릅니다.
  payload: Record<string, string>;
};

export type ConfirmResult =
  | { ok: true; txId: string }
  // declined: PG 가 결제를 거절·취소로 응답한 경우 (시트에 결제실패로 기록). 그 외 오류는 기록하지 않고 재시도하게 둡니다.
  | { ok: false; declined: boolean; reason: string };

export async function confirmWithProvider(input: ConfirmInput): Promise<ConfirmResult> {
  void input;
  // TODO: 올고 승인(검증) API 호출 → 승인되면 { ok: true, txId: 거래번호 }
  return { ok: false, declined: false, reason: "not_implemented" };
}
