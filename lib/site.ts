// 언어와 상관없는 단체 정보·회비 상수. (번역이 필요한 문구는 lib/i18n/ 의 사전 파일에 있습니다.)
// 값을 바꿀 때는 이 파일만 고치면 화면·약관·개인정보처리방침에 함께 반영됩니다.

export const ORG = {
  abbr: "GMU",
  // 사업자등록증 기준
  bizNo: "181-39-01313",
  // 통신판매업 신고 후 번호를 적으면 푸터에 자동 표시됩니다.
  mailOrderNo: "",
  phone: "1522-8656",
  email: "gma.one2025@gmail.com",
  // 회사명·대표자명·주소는 언어별로 lib/i18n/ko.ts, en.ts 의 brand 에 있습니다.
  // (사업자등록증 소재지: 부산광역시 동구 중앙대로226번길 7-8, 5층 일부 — 어느 주소를 쓸지 확인 필요)
} as const;

export type MemberType = "individual" | "corporate";

export const MEMBER_TYPE_KEYS: MemberType[] = ["individual", "corporate"];

// 연회비(원). 서버는 항상 이 값만 결제 금액으로 씁니다.
export const MEMBER_FEES: Record<MemberType, number> = {
  individual: 200000,
  corporate: 500000,
};

export type PaymentMethod = "bank" | "card";

// 시트의 결제수단 열에 저장되는 값
export const SHEET_PAYMENT_LABEL: Record<PaymentMethod, string> = {
  bank: "계좌이체",
  card: "카드",
};

// 시트에는 운영자가 읽기 쉽도록 언어와 상관없이 한글로 저장합니다.
export const SHEET_MEMBER_LABEL: Record<MemberType, string> = {
  individual: "일반",
  corporate: "기업",
};
