import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Guide from "@/components/Guide";
import Apply from "@/components/Apply";
import Faq from "@/components/Faq";
import SiteFooter from "@/components/SiteFooter";
import { getDict, isLocale } from "@/lib/i18n";
import { isPaymentReady } from "@/lib/payment";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);
  return pageMetadata(lang, dict, "", { title: dict.meta.title, description: dict.meta.description });
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDict(lang);

  return (
    <>
      <SiteHeader lang={lang} dict={dict} />
      <main>
        <Hero lang={lang} dict={dict} />
        <About dict={dict} />
        <Guide lang={lang} dict={dict} />
        <Apply lang={lang} dict={dict} cardReady={isPaymentReady()} />
        <Faq dict={dict} />
      </main>
      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
