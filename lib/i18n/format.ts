export type Locale = "ko" | "en";

export const LOCALES: Locale[] = ["ko", "en"];
export const DEFAULT_LOCALE: Locale = "ko";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

function withCommas(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 200000 → "200,000원" / "KRW 200,000"
export function money(lang: Locale, amount: number) {
  return lang === "ko" ? `${withCommas(amount)}원` : `KRW ${withCommas(amount)}`;
}
