import { MEMBER_FEES, MEMBER_TYPE_KEYS } from "@/lib/site";
import { money, type Dict, type Locale } from "@/lib/i18n";
import Rich from "./Rich";

export default function Guide({ lang, dict }: { lang: Locale; dict: Dict }) {
  const g = dict.guide;
  const r = dict.refund;
  return (
    <>
      <section id="guide" className="bg-neutral-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-600">{g.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{g.title}</h2>

          <h3 className="mt-10 text-lg font-bold">{g.typesTitle}</h3>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {MEMBER_TYPE_KEYS.map((key) => (
              <li key={key} className="rounded-2xl border border-ink/10 bg-white p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="text-xl font-bold">{dict.member[key].label}</h4>
                  <p className="text-2xl font-extrabold text-brand-600">
                    {dict.period} {money(lang, MEMBER_FEES[key])}
                  </p>
                </div>
                <p className="mt-2 text-ink/70">{dict.member[key].description}</p>
                <p className="mt-4 border-t border-ink/10 pt-4 text-sm text-ink/60">
                  <span className="font-semibold text-ink">{g.inputItems}</span>
                  <br />
                  {dict.member[key].fields}
                </p>
              </li>
            ))}
          </ul>

          <h3 className="mt-14 text-lg font-bold">{g.stepsTitle}</h3>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {g.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h4 className="mt-4 text-lg font-bold">{s.title}</h4>
                <p className="mt-1 text-ink/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="refund" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-600">{r.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{r.title}</h2>
          <p className="mt-4 text-lg text-ink/70">
            <Rich text={r.lead} />
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {r.rules.map((rule) => (
              <li key={rule.title} className="rounded-2xl border border-ink/10 p-6">
                <h3 className="text-base font-bold">{rule.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{rule.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
