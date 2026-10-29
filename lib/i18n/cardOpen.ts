import type { Locale } from "./format";

// 카드 결제가 열렸을 때(PG_PUBLIC_KEY 설정 시) "카드 결제는 준비 중" 문구 대신 쓰는 안내 문구.
// 카드가 열리기 전에는 ko.ts / en.ts 의 기본 문구(계좌이체만 안내)가 그대로 쓰입니다.
export const cardOpenCopy: Record<Locale, { stepBody: string; faqPay: string; termsPay: string }> = {
  ko: {
    stepBody: "연회비를 카드 또는 계좌이체(무통장입금)로 결제합니다.",
    faqPay:
      "신청서를 제출하면 카드로 바로 결제하거나 계좌이체(무통장입금)로 결제하실 수 있습니다. 카드 정보는 결제대행사 결제창에서 직접 입력하며 이 사이트에는 저장되지 않습니다. 계좌이체는 입금이 확인되면 가입 확인을 안내드립니다.",
    termsPay: "회비는 카드 또는 계좌이체(무통장입금)로 결제하며, 결제(입금)가 확인되면 가입이 확정됩니다.",
  },
  en: {
    stepBody: "Pay the annual fee by card or bank transfer.",
    faqPay:
      "After you submit the application you can pay right away by card, or by bank transfer. Card details are entered directly on the payment provider's checkout page and are never stored on this site. For bank transfers, we send your membership confirmation once the deposit is confirmed.",
    termsPay: "Fees are paid by card or bank transfer, and your membership is confirmed once the payment (or deposit) is confirmed.",
  },
};

export function isCardOpen(): boolean {
  return Boolean(process.env.PG_PUBLIC_KEY?.trim());
}
