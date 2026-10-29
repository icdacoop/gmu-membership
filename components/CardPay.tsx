"use client";

import { useRef, useState } from "react";
import { MEMBER_TYPE_KEYS, type MemberType } from "@/lib/site";
import type { Dict, Locale } from "@/lib/i18n";

// PG 결제창 스크립트(공개). 테스트·운영 모두 같은 스크립트이며 debugMode 로 접속처가 정해집니다.
const SCRIPT_URL = "https://api.ghpayments.kr/js/clientsideV2.js";
const RECEIPT_URL = "https://admin.ghpayments.kr/receipt";

type MaruResponse = {
  result?: { resultCd?: string; resultMsg?: string; advanceMsg?: string };
  auth?: { paymentToken?: string };
};

type AuthPayConfig = {
  payRoute: "3d";
  publicKey: string;
  trackId: string;
  amount: number;
  itemName: string;
  userName: string;
  userTel: string;
  userEmail: string;
  mode: "layer";
  debugMode: "live" | "sandbox";
  responseFunction: (data: MaruResponse) => void;
};

declare global {
  interface Window {
    MARU?: { authPay: (config: AuthPayConfig) => void };
  }
}

type Phase = "idle" | "loading" | "open" | "confirming" | "done" | "declined" | "cancelled" | "error";

export type PayerInfo = {
  memberType: MemberType;
  name: string; // 일반회원: 성명, 기업회원: 기업명
  phone: string;
  email: string;
};

// 결제창 스크립트를 한 번만 불러옵니다. (카드를 고르지 않은 방문자의 페이지 속도에 영향이 없도록 버튼을 누를 때 불러옴)
function loadScript(): Promise<void> {
  if (typeof window !== "undefined" && window.MARU) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const el = existing ?? document.createElement("script");
    const done = () => (window.MARU ? resolve() : reject(new Error("MARU_MISSING")));
    el.addEventListener("load", done, { once: true });
    el.addEventListener("error", () => reject(new Error("SCRIPT_ERROR")), { once: true });
    if (!existing) {
      el.src = SCRIPT_URL;
      el.async = true;
      document.head.appendChild(el);
    }
  });
}

export default function CardPay({
  lang,
  dict,
  orderId,
  amount,
  pg,
  payer,
}: {
  lang: Locale;
  dict: Dict;
  orderId: string;
  amount: number;
  pg: { publicKey: string; env: "sandbox" | "live" };
  payer: PayerInfo;
}) {
  const t = dict.payment;
  const [phase, setPhase] = useState<Phase>("idle");
  const [trxId, setTrxId] = useState("");
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  const label = MEMBER_TYPE_KEYS.includes(payer.memberType) ? dict.member[payer.memberType].label : "";
  // 상품명은 최대 50자. 회원구분과 기간을 넣어 카드 명세서에서 알아볼 수 있게 합니다.
  const itemName = `${dict.brand.name} ${label} ${dict.period}`.slice(0, 50);

  async function confirm(paymentToken: string) {
    if (busy.current) return;
    busy.current = true;
    setPhase("confirming");
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, amount, payload: { paymentToken }, lang }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setTrxId(typeof json.trxId === "string" ? json.trxId : "");
        setPhase("done");
      } else if (json?.declined) {
        setPhase("declined");
      } else {
        setMessage(json?.error ?? "");
        setPhase("error");
      }
    } catch {
      setPhase("error");
    } finally {
      busy.current = false;
    }
  }

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setMessage("");
    setPhase("loading");

    try {
      await loadScript();
    } catch {
      setMessage(t.card.scriptError);
      setPhase("error");
      busy.current = false;
      return;
    }

    setPhase("open");
    busy.current = false; // 결제창이 열려 있는 동안에는 다시 누를 수 있음(창을 닫아도 콜백이 없을 수 있어 멈추지 않게)
    window.MARU!.authPay({
      payRoute: "3d", // 온라인 인증 결제 고정값
      publicKey: pg.publicKey,
      trackId: orderId, // 접수번호가 곧 PG 주문번호
      amount,
      itemName,
      userName: payer.name,
      userTel: payer.phone.replace(/\D/g, ""),
      userEmail: payer.email,
      mode: "layer",
      debugMode: pg.env,
      // 결과는 이 콜백으로만 받습니다. (redirectUrl 을 쓰면 결제 토큰이 주소창에 남아서 사용하지 않음)
      responseFunction: (data) => {
        const token = data?.auth?.paymentToken;
        if (data?.result?.resultCd === "0000" && token) {
          void confirm(token);
        } else {
          // 사용자가 결제창을 닫거나 인증에 실패한 경우
          setPhase("cancelled");
        }
      },
    });
  }

  if (phase === "done") {
    return (
      <div className="mt-6" role="status">
        <p className="text-lg font-bold">{t.doneTitle}</p>
        <p className="mt-2 text-sm text-ink/70">{t.doneBody}</p>
        {trxId && (
          <a
            href={`${RECEIPT_URL}?trxId=${encodeURIComponent(trxId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold transition hover:bg-neutral-50"
          >
            {t.card.receipt}
          </a>
        )}
      </div>
    );
  }

  const busyNow = phase === "loading" || phase === "confirming";
  const note =
    phase === "declined"
      ? t.card.declined
      : phase === "cancelled"
        ? t.card.cancelled
        : phase === "error"
          ? message || t.errorBody
          : "";

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={start}
        disabled={busyNow}
        className="w-full max-w-sm rounded-full bg-brand-600 px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase === "loading" ? t.card.opening : phase === "confirming" ? t.checking : phase === "idle" ? t.card.button : t.retry}
      </button>
      {note && (
        <p role="alert" className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-brand-700">
          {note}
        </p>
      )}
    </div>
  );
}
