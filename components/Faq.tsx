import type { Dict } from "@/lib/i18n";

export default function Faq({ dict }: { dict: Dict }) {
  return (
    <section id="faq" className="bg-neutral-50 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-brand-600">{dict.faq.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{dict.faq.title}</h2>
        <div className="mt-8 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {dict.faq.items.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden className="text-xl text-brand-600 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
