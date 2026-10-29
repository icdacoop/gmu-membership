import { ko, type Dict } from "./ko";
import { en } from "./en";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./format";
import { cardOpenCopy, isCardOpen } from "./cardOpen";

export { LOCALES, DEFAULT_LOCALE, isLocale, money, type Locale } from "./format";
export type { Dict };

const dictionaries: Record<Locale, Dict> = { ko, en };

// 서버에서만 호출합니다. 카드 결제가 열려 있으면(PG_PUBLIC_KEY 설정) 결제 안내 문구를 카드 포함 문구로 바꿔 줍니다.
export function getDict(lang: Locale): Dict {
  const base = dictionaries[isLocale(lang) ? lang : DEFAULT_LOCALE];
  if (!isCardOpen()) return base;

  const copy = cardOpenCopy[isLocale(lang) ? lang : DEFAULT_LOCALE];
  return {
    ...base,
    guide: { ...base.guide, steps: base.guide.steps.map((s, i) => (i === 1 ? { ...s, body: copy.stepBody } : s)) },
    faq: { ...base.faq, items: base.faq.items.map((f, i) => (i === 1 ? { ...f, a: copy.faqPay } : f)) },
  };
}
