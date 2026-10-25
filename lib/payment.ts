// 결제(올고 PG) 연동은 이 파일 한 곳에 모읍니다.
// 올고에서 연동 가이드·상점 키를 받으면 아래 TODO 를 채우고 isPaymentReady 를 true 로 바꿉니다.
//
// 예정 흐름
//   1. 신청 접수 후 결제창 호출 (접수번호, 회원구분별 금액)
//   2. 결제 성공 시 서버에서 올고 승인(검증) API 호출 → 금액 대조
//   3. 승인 성공 시 시트의 해당 접수번호 행을 "결제완료"로 갱신 (Apps Script 의 mark_paid)

export function isPaymentReady(): boolean {
  // TODO: 올고 연동 구현 후 true 로 변경 (환경변수 PG_MERCHANT_ID, PG_SECRET_KEY 사용 예정)
  return false;
}
