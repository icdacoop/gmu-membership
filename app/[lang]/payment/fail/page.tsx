import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getDict, isLocale } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// PG 결제창에서 실패하거나 취소하면 이 주소로 돌아옵니다.
export default async function PaymentFailPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDict(lang);
  const t = dict.payment;

  return (
    <>
      <SiteHeader lang={lang} dict={dict} path="/payment/fail" />
      <main className="bg-neutral-50 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-lg rounded-3xl border border-ink/10 bg-white p-8 text-center sm:p-10">
          <h1 className="text-2xl font-extrabold">{t.failTitle}</h1>
          <p className="mt-3 text-ink/70">{t.failBody}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/${lang}#apply`}
              className="rounded-full bg-brand-600 px-7 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
            >
              {t.retry}
            </Link>
            <Link
              href={`/${lang}`}
              className="rounded-full border border-ink/20 px-7 py-3 text-base font-semibold transition hover:bg-neutral-50"
            >
              {t.home}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
