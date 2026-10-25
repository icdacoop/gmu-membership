import type { Dict } from "@/lib/i18n";

export default function About({ dict }: { dict: Dict }) {
  const a = dict.about;
  return (
    <section id="about" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold text-brand-600">{a.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{a.title}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink/70">{dict.tagline}</p>

        <h3 className="mt-14 text-lg font-bold">{a.visionTitle}</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {a.visions.map((v, i) => (
            <li key={v.title} className="rounded-2xl border border-ink/10 p-6">
              <span className="text-sm font-bold text-brand-600">0{i + 1}</span>
              <h4 className="mt-2 text-lg font-bold">{v.title}</h4>
              <p className="mt-2 leading-relaxed text-ink/70">{v.body}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-14 text-lg font-bold">{a.activityTitle}</h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {a.activities.map((act) => (
            <li key={act.title} className="rounded-2xl bg-ink p-6 text-white">
              <h4 className="text-lg font-bold">{act.title}</h4>
              <p className="mt-2 leading-relaxed text-white/75">{act.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
