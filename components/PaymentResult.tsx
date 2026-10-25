"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";

type State = "checking" | "done" | "failed" | "error";

// 결제 성공 페이지에서 PG 가 돌려준 값을 서버(/api/payment/confirm)에 보내 결제를 최종 확인합니다.
export default function PaymentResult({
  lang,
  dict,
  orderId,
  amount,
  payload,
}: {
  lang: Locale;
  dict: Dict;
  orderId: string;
  amount: number;
  payload: Record<string, string>;
}) {
  const t = dict.payment;
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 확인 요청은 한 번만 보냅니다.
    if (started.current) return;
    started.current = true;

    fetch("/api/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount, payload, lang }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) setState("done");
        else {
          setMessage(json?.error ?? "");
          setState(json?.declined ? "failed" : "error");
        }
      })
      .catch(() => setState("error"));
  }, [orderId, amount, payload, lang]);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-ink/10 bg-white p-8 text-center sm:p-10" role="status">
      {state === "checking" && <p className="text-lg font-semibold">{t.checking}</p>}

      {state === "done" && (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white">
            ✓
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">{t.doneTitle}</h1>
          <p className="mt-3 text-ink/70">{t.doneBody}</p>
        </>
      )}

      {(state === "failed" || state === "error") && (
        <>
          <h1 className="text-2xl font-extrabold">{state === "failed" ? t.failTitle : t.errorTitle}</h1>
          <p className="mt-3 text-ink/70">{state === "failed" ? t.failBody : message || t.errorBody}</p>
          {state === "error" && message && <p className="mt-2 text-sm text-ink/50">{t.errorBody}</p>}
        </>
      )}

      {state !== "checking" && (
        <>
          <dl className="mx-auto mt-6 max-w-xs rounded-2xl bg-neutral-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">{t.orderId}</dt>
              <dd className="font-bold">{orderId}</dd>
            </div>
          </dl>
          <Link
            href={`/${lang}`}
            className="mt-6 inline-block rounded-full bg-ink px-7 py-3 text-base font-semibold text-white transition hover:bg-ink-soft"
          >
            {t.home}
          </Link>
        </>
      )}
    </div>
  );
}
