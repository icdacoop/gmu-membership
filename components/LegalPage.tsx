import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import type { Dict, Locale } from "@/lib/i18n";

export default function LegalPage({
  lang,
  dict,
  path,
  title,
  children,
}: {
  lang: Locale;
  dict: Dict;
  path: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader lang={lang} dict={dict} path={path} />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-ink/50">
          {dict.legal.effective} {dict.legal.effectiveDate}
        </p>
        <div className="mt-10 space-y-10 leading-relaxed text-ink/80 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-ink/15 [&_td]:p-3 [&_th]:border [&_th]:border-ink/15 [&_th]:bg-neutral-50 [&_th]:p-3 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
