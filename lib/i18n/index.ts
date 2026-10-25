import { ko, type Dict } from "./ko";
import { en } from "./en";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./format";

export { LOCALES, DEFAULT_LOCALE, isLocale, money, type Locale } from "./format";
export type { Dict };

const dictionaries: Record<Locale, Dict> = { ko, en };

export function getDict(lang: Locale): Dict {
  return dictionaries[isLocale(lang) ? lang : DEFAULT_LOCALE];
}
