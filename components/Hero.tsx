import Image from "next/image";
import { MEMBER_FEES, MEMBER_TYPE_KEYS } from "@/lib/site";
import { money, type Dict, type Locale } from "@/lib/i18n";

export default function Hero({ lang, dict }: { lang: Locale; dict: Dict }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/30 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.3fr_1fr] md:items-center md:py-24">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{dict.brand.nameEn}</p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
            {dict.hero.line1}
            <br />
            {dict.hero.line2}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{dict.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#apply"
              className="rounded-full bg-brand-600 px-7 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
            >
              {dict.hero.join}
            </a>
            <a
              href="#guide"
              className="rounded-full border border-white/30 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {dict.hero.guide}
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <Image src="/logo-original.png" alt={dict.brand.logoAlt} width={64} height={64} className="rounded-full" />
            <div>
              <p className="text-lg font-bold">{dict.brand.name}</p>
              <p className="text-sm text-white/60">
                {dict.hero.feeCaption} ({dict.period})
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {MEMBER_TYPE_KEYS.map((key) => (
              <li key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-5 py-4">
                <span className="font-semibold">{dict.member[key].label}</span>
                <span className="whitespace-nowrap text-lg font-extrabold">
                  {money(lang, MEMBER_FEES[key])}
                  <span className="ml-1 text-sm font-medium text-white/60">{dict.perPeriod}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
