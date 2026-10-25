import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PaymentResult from "@/components/PaymentResult";
import { getDict, isLocale } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// PG 결제창에서 성공하면 이 주소로 돌아옵니다. 돌아오는 값의 이름(orderId, amount 등)은 올고 사양에 맞춰 조정합니다.
export default async function PaymentSuccessPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDict(lang);

  const query = await searchParams;
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === "string") payload[k] = value;
  }
  const orderId = payload.orderId ?? "";
  const amount = Number(payload.amount);

  // 언어를 바꿔도 같은 결제 결과 화면이 열리도록 쿼리를 그대로 이어 붙입니다.
  const qs = new URLSearchParams(payload).toString();

  return (
    <>
      <SiteHeader lang={lang} dict={dict} path={`/payment/success${qs ? `?${qs}` : ""}`} />
      <main className="bg-neutral-50 px-4 py-16 sm:py-24">
        <PaymentResult lang={lang} dict={dict} orderId={orderId} amount={amount} payload={payload} />
      </main>
      <SiteFooter lang={lang} dict={dict} />
    </>
  );
}
