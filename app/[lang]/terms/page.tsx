import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/LegalPage";
import LegalSections from "@/components/LegalSections";
import { getDict, isLocale } from "@/lib/i18n";
import { termsContent } from "@/lib/i18n/legal";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? { title: getDict(lang).meta.termsTitle } : {};
}

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDict(lang);

  return (
    <LegalPage lang={lang} dict={dict} path="/terms" title={dict.legal.termsTitle}>
      <LegalSections sections={termsContent(lang).sections} />
    </LegalPage>
  );
}
