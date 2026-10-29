"use client";

import { useState } from "react";
import { MEMBER_FEES, MEMBER_TYPE_KEYS, type MemberType, type PaymentMethod } from "@/lib/site";
import { money, type Dict, type Locale } from "@/lib/i18n";
import { formatPhone, validateApplication } from "@/lib/validation";
import type { BankInfo } from "@/lib/bank";
import BankGuide from "./BankGuide";
import CardPay from "./CardPay";

type Values = {
  name: string;
  companyName: string;
  ceoName: string;
  phone: string;
  email: string;
  interest: string;
  consent: boolean;
  website: string; // 숨김 칸(허니팟)
};

const EMPTY: Values = {
  name: "",
  companyName: "",
  ceoName: "",
  phone: "",
  email: "",
  interest: "",
  consent: false,
  website: "",
};

type Done = {
  orderId: string;
  amount: number;
  paymentReady: boolean;
  paymentMethod: PaymentMethod;
  bank: BankInfo | null;
  // 카드 결제창 호출에 필요한 공개 값(결제키·환경). 카드를 골랐고 결제가 열려 있을 때만 있음
  pg: { publicKey: string; env: "sandbox" | "live" } | null;
  depositor: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 aria-[invalid=true]:border-brand-600";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="ml-1 text-brand-600">*</span>
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink/50">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-brand-600">
          {error}
        </p>
      )}
    </div>
  );
}

// cardReady: 카드 결제가 열려 있는지. false 이면 카드 선택지는 "준비 중"으로 막아 둡니다.
export default function ApplyForm({ lang, dict, cardReady }: { lang: Locale; dict: Dict; cardReady: boolean }) {
  const t = dict.apply;
  const [memberType, setMemberType] = useState<MemberType>("individual");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const fee = MEMBER_FEES[memberType];

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function aria(id: string) {
    return { "aria-invalid": errors[id] ? true : undefined, "aria-describedby": errors[id] ? `${id}-error` : undefined };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setServerError("");

    const raw =
      memberType === "individual"
        ? { memberType, name: values.name }
        : { memberType, companyName: values.companyName, ceoName: values.ceoName };
    const result = validateApplication(
      {
        ...raw,
        phone: values.phone,
        email: values.email,
        interest: values.interest,
        paymentMethod,
        consent: values.consent,
        website: values.website,
      },
      dict.validation,
    );

    if (!result.ok) {
      setErrors(result.errors);
      const first = Object.keys(result.errors)[0];
      document.getElementById(first)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.data, lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        if (json?.errors) setErrors(json.errors);
        setServerError(json?.error ?? t.errGeneric);
        return;
      }
      setDone({
        orderId: json.orderId,
        amount: json.amount,
        paymentReady: Boolean(json.paymentReady),
        paymentMethod: json.paymentMethod === "card" ? "card" : "bank",
        bank: json.bank ?? null,
        pg: json.pg ?? null,
        depositor: json.depositor ?? "",
      });
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setServerError(t.errNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-6 text-center sm:p-10" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white">
          ✓
        </span>
        <h3 className="mt-5 text-2xl font-extrabold">{t.doneTitle}</h3>
        <dl className="mx-auto mt-6 max-w-sm space-y-2 rounded-2xl bg-neutral-50 p-5 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{t.orderId}</dt>
            <dd className="font-bold">{done.orderId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{t.memberRow}</dt>
            <dd className="font-bold">{dict.member[memberType].label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{t.paymentMethod}</dt>
            <dd className="font-bold">{done.paymentMethod === "bank" ? t.methodBank : t.methodCard}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink/60">{t.amountRow}</dt>
            <dd className="font-bold">
              {money(lang, done.amount || fee)} ({dict.period})
            </dd>
          </div>
        </dl>

        {done.paymentMethod === "bank" ? (
          <BankGuide lang={lang} dict={dict} bank={done.bank} amount={done.amount || fee} depositor={done.depositor} />
        ) : done.paymentReady && done.pg ? (
          <CardPay
            lang={lang}
            dict={dict}
            orderId={done.orderId}
            amount={done.amount || fee}
            pg={done.pg}
            payer={{
              memberType,
              // 카드 결제창의 구매자명: 일반회원은 성명, 기업회원은 기업명
              name: memberType === "individual" ? values.name : values.companyName,
              phone: values.phone,
              email: values.email,
            }}
          />
        ) : (
          <>
            <button
              type="button"
              disabled
              className="mt-6 w-full max-w-sm cursor-not-allowed rounded-full bg-ink/15 px-6 py-3.5 text-base font-bold text-ink/45"
            >
              {t.payPending}
            </button>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/60">{t.payNote}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-3xl border border-ink/10 bg-white p-5 sm:p-8">
      <fieldset>
        <legend className="text-sm font-semibold">
          {t.memberType}
          <span className="ml-1 text-brand-600">*</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MEMBER_TYPE_KEYS.map((key) => {
            const active = memberType === key;
            return (
              <label
                key={key}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                  active ? "border-brand-600 bg-brand-50" : "border-ink/10 hover:border-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name="memberType"
                  value={key}
                  checked={active}
                  onChange={() => {
                    setMemberType(key);
                    setErrors({});
                  }}
                  className="sr-only"
                />
                <span className="flex flex-wrap items-center justify-between gap-x-3">
                  <span className="font-bold">{dict.member[key].label}</span>
                  <span className="font-extrabold text-brand-600">
                    {dict.period} {money(lang, MEMBER_FEES[key])}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-ink/60">{dict.member[key].description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold">
          {t.paymentMethod}
          <span className="ml-1 text-brand-600">*</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["bank", "card"] as PaymentMethod[]).map((method) => {
            const disabled = method === "card" && !cardReady;
            const active = paymentMethod === method;
            return (
              <label
                key={method}
                className={`rounded-2xl border-2 p-4 transition ${
                  disabled
                    ? "cursor-not-allowed border-ink/10 bg-neutral-50 opacity-60"
                    : active
                      ? "cursor-pointer border-brand-600 bg-brand-50"
                      : "cursor-pointer border-ink/10 hover:border-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={active}
                  disabled={disabled}
                  onChange={() => setPaymentMethod(method)}
                  className="sr-only"
                />
                <span className="flex flex-wrap items-center justify-between gap-x-3">
                  <span className="font-bold">{method === "bank" ? t.methodBank : t.methodCard}</span>
                  {disabled && <span className="text-xs font-semibold text-ink/50">{t.methodSoon}</span>}
                </span>
                <span className="mt-1 block text-sm text-ink/60">
                  {method === "bank" ? t.methodBankDesc : t.methodCardDesc}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {memberType === "individual" ? (
          <Field id="name" label={t.name} error={errors.name}>
            <input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              placeholder={t.placeholderName}
              className={inputClass}
              {...aria("name")}
            />
          </Field>
        ) : (
          <>
            <Field id="companyName" label={t.companyName} error={errors.companyName}>
              <input
                id="companyName"
                value={values.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                autoComplete="organization"
                placeholder={t.placeholderCompany}
                className={inputClass}
                {...aria("companyName")}
              />
            </Field>
            <Field id="ceoName" label={t.ceoName} error={errors.ceoName}>
              <input
                id="ceoName"
                value={values.ceoName}
                onChange={(e) => set("ceoName", e.target.value)}
                placeholder={t.placeholderName}
                className={inputClass}
                {...aria("ceoName")}
              />
            </Field>
          </>
        )}

        <Field id="phone" label={t.phone} error={errors.phone}>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={values.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            autoComplete="tel"
            placeholder="010-0000-0000"
            className={inputClass}
            {...aria("phone")}
          />
        </Field>

        <Field id="email" label={t.email} error={errors.email}>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
            className={inputClass}
            {...aria("email")}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field id="interest" label={t.interest} error={errors.interest} hint={t.interestHint}>
          <textarea
            id="interest"
            rows={3}
            maxLength={300}
            value={values.interest}
            onChange={(e) => set("interest", e.target.value)}
            className={inputClass}
            {...aria("interest")}
          />
        </Field>
      </div>

      {/* 봇 차단용 숨김 칸: 사람에게는 보이지 않습니다. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          {t.honeypot}
          <input
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 rounded-2xl bg-neutral-50 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="consent"
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
            {...aria("consent")}
          />
          <span className="text-sm font-semibold">{t.consentLabel}</span>
        </label>
        {errors.consent && (
          <p id="consent-error" role="alert" className="mt-2 text-sm text-brand-600">
            {errors.consent}
          </p>
        )}
        <details className="mt-3 text-sm text-ink/70">
          <summary className="cursor-pointer font-medium text-ink/80">{t.consentMore}</summary>
          <dl className="mt-3 space-y-2 leading-relaxed">
            <div>
              <dt className="font-semibold text-ink">{dict.consent.itemsLabel}</dt>
              <dd>{dict.consent.items}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{dict.consent.purposeLabel}</dt>
              <dd>{dict.consent.purpose}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{dict.consent.retentionLabel}</dt>
              <dd>{dict.consent.retention}</dd>
            </div>
            <div className="text-ink/60">{dict.consent.refusal}</div>
            <div>
              <a href={`/${lang}/privacy`} target="_blank" className="font-semibold text-brand-600 underline">
                {t.privacyLink}
              </a>
            </div>
          </dl>
        </details>
      </div>

      {serverError && (
        <p role="alert" className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          {serverError}
        </p>
      )}

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/60">
          {t.feeCaption} <strong className="ml-1 text-xl font-extrabold text-ink">{money(lang, fee)}</strong> {dict.perPeriod}
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-600 px-8 py-3.5 text-base font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t.submitting : paymentMethod === "bank" ? t.submitBank : t.submit}
        </button>
      </div>
    </form>
  );
}
