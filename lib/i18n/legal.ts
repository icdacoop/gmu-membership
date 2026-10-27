import { MEMBER_FEES, MEMBER_TYPE_KEYS, ORG } from "../site";
import { money, type Locale } from "./format";
import { ko } from "./ko";
import { en } from "./en";

// 개인정보처리방침·이용약관 본문. 화면에서는 LegalSections 컴포넌트가 이 구조를 그대로 그립니다.
export type LegalSection = {
  title: string;
  paragraphs?: string[];
  table?: { head: string[]; rows: string[][] };
  list?: string[];
  after?: string[];
};

const dicts = { ko, en };

export function privacyContent(lang: Locale): { intro: string; sections: LegalSection[] } {
  const d = dicts[lang];

  if (lang === "ko") {
    return {
      intro: `${d.brand.name}(이하 “연합”)은 회원 가입 신청을 처리하기 위해 필요한 최소한의 개인정보만 수집하며, 관련 법령에 따라 안전하게 관리합니다.`,
      sections: [
        {
          title: "1. 수집하는 개인정보 항목",
          table: {
            head: ["회원구분", "수집 항목 (필수)"],
            rows: [
              [d.member.individual.label, d.member.individual.fields],
              [d.member.corporate.label, d.member.corporate.fields],
            ],
          },
          list: [
            "자동 생성 정보: 접수번호, 접수일시, 개인정보 수집·이용 동의 일시, 신청 언어, 결제수단, 결제 거래번호·결제일시",
            "계좌이체로 결제하시는 경우 입금 확인을 위해 은행 입금 내역(입금자명, 입금액)을 확인합니다.",
            "카드번호 등 카드 결제정보는 결제대행사 결제창에서 직접 입력되며 연합은 저장하지 않습니다.",
          ],
        },
        { title: "2. 수집·이용 목적", paragraphs: [d.consent.purpose] },
        {
          title: "3. 보유 및 이용 기간",
          table: {
            head: ["정보", "보유 기간", "근거"],
            rows: [
              ["회원 신청·가입 정보", "회원 자격 유지 기간 동안 보관, 종료 후 지체 없이 파기", "이용 목적 달성"],
              ["결제를 완료하지 않은 신청 정보", "접수일로부터 30일 후 파기", "이용 목적 달성"],
              ["계약·청약철회, 대금결제 기록", "5년", "전자상거래 등에서의 소비자보호에 관한 법률"],
              ["소비자 불만·분쟁처리 기록", "3년", "전자상거래 등에서의 소비자보호에 관한 법률"],
            ],
          },
        },
        {
          title: "4. 개인정보의 제3자 제공",
          paragraphs: ["연합은 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 따라 요구되는 경우는 예외로 합니다."],
        },
        {
          title: "5. 개인정보 처리 위탁 및 국외 저장",
          table: {
            head: ["수탁자", "위탁 업무"],
            rows: [
              ["올고(결제대행사)", "회비 카드 결제 처리"],
              ["Google LLC", "신청 정보 저장·관리 (구글 스프레드시트, 미국 등 국외 서버)"],
            ],
          },
        },
        {
          title: "6. 파기 절차 및 방법",
          paragraphs: ["보유 기간이 끝났거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제합니다."],
        },
        {
          title: "7. 이용자의 권리",
          paragraphs: [
            "이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 동의를 거부할 수 있습니다. 다만 동의를 거부하면 회원 가입이 어렵습니다. 아래 연락처로 요청해 주세요.",
          ],
        },
        {
          title: "8. 개인정보 보호책임자",
          list: [`책임자: 대표 ${d.brand.ceo}`, `전화: ${ORG.phone}`, `이메일: ${ORG.email}`, `주소: ${d.brand.address}`],
        },
      ],
    };
  }

  return {
    intro: `${d.brand.name} (the “Union”) collects only the minimum personal information needed to process membership applications and manages it securely in accordance with applicable law.`,
    sections: [
      {
        title: "1. Personal information we collect",
        table: {
          head: ["Membership type", "Information collected (required)"],
          rows: [
            [d.member.individual.label, d.member.individual.fields],
            [d.member.corporate.label, d.member.corporate.fields],
          ],
        },
        list: [
          "Automatically generated: application number, submission time, time of consent, application language, payment method, payment transaction number and payment time",
          "If you pay by bank transfer, we check the bank deposit record (depositor name and amount) to confirm your payment.",
          "Card details are entered directly on the payment provider's checkout page and are not stored by the Union.",
        ],
      },
      { title: "2. Purpose of collection and use", paragraphs: [d.consent.purpose] },
      {
        title: "3. Retention period",
        table: {
          head: ["Information", "Retention period", "Basis"],
          rows: [
            [
              "Membership application and registration data",
              "Kept while membership is active; destroyed without delay afterwards",
              "Fulfilment of purpose",
            ],
            ["Applications for which payment was not completed", "Destroyed 30 days after submission", "Fulfilment of purpose"],
            ["Contract, withdrawal and payment records", "5 years", "Korean Act on Consumer Protection in Electronic Commerce"],
            ["Consumer complaint and dispute records", "3 years", "Korean Act on Consumer Protection in Electronic Commerce"],
          ],
        },
      },
      {
        title: "4. Provision to third parties",
        paragraphs: [
          "The Union does not provide personal information to third parties without your consent, except where required by law.",
        ],
      },
      {
        title: "5. Processing agents and overseas storage",
        table: {
          head: ["Processor", "Entrusted task"],
          rows: [
            ["Allgo (payment service provider)", "Processing membership fee card payments"],
            ["Google LLC", "Storing and managing application data (Google Sheets; servers outside Korea, including the United States)"],
          ],
        },
      },
      {
        title: "6. Destruction procedure and method",
        paragraphs: [
          "Personal information whose retention period has ended or whose purpose has been fulfilled is destroyed without delay. Electronic files are deleted in a way that cannot be recovered.",
        ],
      },
      {
        title: "7. Your rights",
        paragraphs: [
          "You may at any time request access to, correction, deletion or suspension of processing of your personal information, and you may refuse consent. However, membership cannot be processed without consent. Please contact us using the details below.",
        ],
      },
      {
        title: "8. Privacy officer",
        list: [`Officer: CEO ${d.brand.ceo}`, `Phone: ${ORG.phone} (Korea)`, `Email: ${ORG.email}`, `Address: ${d.brand.address}`],
      },
    ],
  };
}

export function termsContent(lang: Locale): { sections: LegalSection[] } {
  const d = dicts[lang];
  const ko_ = lang === "ko";

  const business = [
    ko_ ? `상호: ${d.brand.name}` : `Company name: ${d.brand.name}`,
    ko_ ? `대표자: ${d.brand.ceo}` : `Representative: ${d.brand.ceo}`,
    ko_ ? `사업자등록번호: ${ORG.bizNo}` : `Business registration no.: ${ORG.bizNo}`,
    ...(ORG.mailOrderNo ? [ko_ ? `통신판매업신고번호: ${ORG.mailOrderNo}` : `Mail-order business reg. no.: ${ORG.mailOrderNo}`] : []),
    ko_ ? `주소: ${d.brand.address}` : `Address: ${d.brand.address}`,
    ko_ ? `고객센터: ${ORG.phone} / ${ORG.email}` : `Customer service: ${ORG.phone} (Korea) / ${ORG.email}`,
  ];

  return {
    sections: [
      { title: ko_ ? "1. 사업자 정보" : "1. Business information", list: business },
      {
        title: ko_ ? "2. 회원 구분 및 회비" : "2. Membership types and fees",
        table: {
          head: ko_ ? ["구분", "연회비", "이용 기간"] : ["Type", "Annual fee", "Period"],
          rows: MEMBER_TYPE_KEYS.map((k) => [
            d.member[k].label,
            money(lang, MEMBER_FEES[k]),
            ko_ ? `결제일로부터 ${d.period}` : `${d.period} from the payment date`,
          ]),
        },
        after: [
          ko_
            ? "회비는 계좌이체(무통장입금)로 결제하며(카드 결제는 준비 중), 입금이 확인되면 가입이 확정됩니다."
            : "Fees are paid by bank transfer (card payment is coming soon), and your membership is confirmed once the deposit is confirmed.",
        ],
      },
      {
        title: ko_ ? "3. 환불 규정" : "3. Refund policy",
        paragraphs: [
          ko_
            ? "결제 후 1개월 이내 취소하시면 회비 100%를 환불해 드립니다."
            : "If you cancel within 1 month of payment, we refund 100% of your fee.",
        ],
        list: d.refund.rules.map((r) => `${r.title}: ${r.body}`),
      },
    ],
  };
}
