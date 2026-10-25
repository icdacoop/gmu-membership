import ApplyForm from "./ApplyForm";
import type { Dict, Locale } from "@/lib/i18n";

export default function Apply({ lang, dict }: { lang: Locale; dict: Dict }) {
  return (
    <section id="apply" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-brand-600">{dict.apply.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{dict.apply.title}</h2>
        <p className="mt-3 mb-8 text-ink/70">{dict.apply.intro}</p>
        <ApplyForm lang={lang} dict={dict} />
      </div>
    </section>
  );
}
