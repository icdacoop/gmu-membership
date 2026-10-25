import Link from "next/link";
import { ORG } from "@/lib/site";
import type { Dict, Locale } from "@/lib/i18n";

export default function SiteFooter({ lang, dict }: { lang: Locale; dict: Dict }) {
  const f = dict.footer;
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-lg font-bold text-white">{dict.brand.name}</p>
        <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            {f.ceo} {dict.brand.ceo}
          </div>
          <div>
            {f.bizNo} {ORG.bizNo}
          </div>
          {ORG.mailOrderNo && (
            <div>
              {f.mailOrder} {ORG.mailOrderNo}
            </div>
          )}
          <div>
            {f.address} {dict.brand.address}
          </div>
          <div>
            {f.tel} <a href={`tel:${ORG.phone}`}>{ORG.phone}</a>
          </div>
          <div>
            {f.email} <a href={`mailto:${ORG.email}`}>{ORG.email}</a>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm">
          <Link href={`/${lang}/terms`} className="hover:text-white">
            {f.terms}
          </Link>
          <Link href={`/${lang}/privacy`} className="font-semibold hover:text-white">
            {f.privacy}
          </Link>
          <span className="text-white/40">
            © {new Date().getFullYear()} {dict.brand.name}. {f.rights}
          </span>
        </div>
      </div>
    </footer>
  );
}
