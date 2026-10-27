"use client";

import { useState } from "react";
import { money, type Dict, type Locale } from "@/lib/i18n";
import type { BankInfo } from "@/lib/bank";

// 신청 완료 후 보여 주는 계좌이체(무통장입금) 안내
export default function BankGuide({
  lang,
  dict,
  bank,
  amount,
  depositor,
}: {
  lang: Locale;
  dict: Dict;
  bank: BankInfo | null;
  amount: number;
  depositor: string;
}) {
  const t = dict.apply;
  const [copied, setCopied] = useState(false);

  // 계좌가 아직 설정되지 않았다면 이메일·전화로 안내한다고 알려 줍니다.
  if (!bank) {
    return <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink/60">{t.bankPending}</p>;
  }

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(bank!.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사가 막힌 환경에서는 계좌번호를 직접 선택해서 복사하면 됩니다.
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-sm text-left">
      <h4 className="text-base font-bold">{t.bankTitle}</h4>
      <dl className="mt-3 space-y-2.5 rounded-2xl border-2 border-brand-600 bg-brand-50 p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink/60">{t.bankName}</dt>
          <dd className="font-bold">{bank.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink/60">{t.bankAccount}</dt>
          <dd className="flex items-center gap-2 font-bold">
            <span className="select-all">{bank.account}</span>
            <button
              type="button"
              onClick={copyAccount}
              className="rounded-full border border-ink/20 bg-white px-2.5 py-0.5 text-xs font-semibold transition hover:bg-neutral-50"
            >
              {copied ? t.bankCopied : t.bankCopy}
            </button>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink/60">{t.bankHolder}</dt>
          <dd className="font-bold">{bank.holder}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink/60">{t.bankAmount}</dt>
          <dd className="font-extrabold text-brand-600">{money(lang, amount)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink/60">{t.bankDepositor}</dt>
          <dd className="font-bold">{depositor}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-ink/60">{t.bankNote}</p>
    </div>
  );
}
