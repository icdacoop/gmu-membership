import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/LegalPage";
import LegalSections from "@/components/LegalSections";
import { getDict, isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { privacyContent } from "@/lib/i18n/legal";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDict(lang);
  return pageMetadata(lang, dict, "/privacy", { title: dict.meta.privacyTitle, description: dict.meta.privacyDescription });
}

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDict(lang);
  const { intro, sections } = privacyContent(lang);

  return (
    <LegalPage lang={lang} dict={dict} path="/privacy" title={dict.legal.privacyTitle}>
      <p>{intro}</p>
      <LegalSections sections={sections} />
    </LegalPage>
  );
}
