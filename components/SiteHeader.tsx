"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";

// path: 언어를 바꿀 때 같은 페이지로 이동하기 위한 현재 경로 (예: "" 또는 "/privacy")
export default function SiteHeader({ lang, dict, path = "" }: { lang: Locale; dict: Dict; path?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const other: Locale = lang === "ko" ? "en" : "ko";

  // 로고·이름을 누르면 첫 화면(맨 위)으로 갑니다.
  // 이미 첫 페이지에 있으면 같은 주소로의 이동이라 화면이 그대로이므로, 직접 맨 위로 올리고 #앵커도 지웁니다.
  // (다른 페이지에 있을 때는 평소처럼 첫 페이지로 이동하며 맨 위에서 열립니다.)
  function goHome(e: React.MouseEvent<HTMLAnchorElement>) {
    setOpen(false);
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // 새 탭 열기 등은 그대로 둠
    if (pathname !== `/${lang}`) return;
    e.preventDefault();
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", `/${lang}${window.location.search}`);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" }); // CSS 설정에 따라 부드럽게(동작 줄이기 설정이면 즉시) 이동
  }

  const nav = [
    { href: `/${lang}#about`, label: dict.nav.about },
    { href: `/${lang}#guide`, label: dict.nav.guide },
    { href: `/${lang}#refund`, label: dict.nav.refund },
    { href: `/${lang}#faq`, label: dict.nav.faq },
  ];

  // 선택한 언어를 기억해서 다음 방문 때 같은 언어로 열어 줍니다.
  function rememberLang() {
    try {
      document.cookie = `lang=${other}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // 쿠키를 쓸 수 없어도 언어 전환 자체는 동작합니다.
    }
  }

  const switchLink = (
    <Link
      href={`/${other}${path}`}
      hrefLang={other}
      lang={other}
      onClick={rememberLang}
      aria-label={dict.nav.switchAria}
      className="rounded-full border border-white/30 px-3.5 py-1.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
    >
      {dict.nav.switchLabel}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={`/${lang}`} className="flex min-w-0 items-center gap-3" onClick={goHome}>
          <Image src="/logo-original.png" alt="" width={36} height={36} className="rounded-full" priority />
          <span className="truncate text-base font-bold tracking-tight">{dict.brand.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/80 md:flex" aria-label={dict.nav.main}>
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">{switchLink}</div>
          <Link
            href={`/${lang}#apply`}
            className="whitespace-nowrap rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:px-5"
          >
            {dict.nav.join}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 md:hidden"
          >
            <span aria-hidden className="relative block h-3.5 w-5">
              <span
                className={`absolute left-0 h-0.5 w-5 bg-white transition ${open ? "top-1.5 rotate-45" : "top-0"}`}
              />
              <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-white transition ${open ? "opacity-0" : ""}`} />
              <span
                className={`absolute left-0 h-0.5 w-5 bg-white transition ${open ? "top-1.5 -rotate-45" : "top-3"}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label={dict.nav.main}
          className="border-t border-white/10 bg-ink px-4 pb-5 pt-2 md:hidden"
        >
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/10 py-3.5 text-base font-medium text-white/90"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 sm:hidden">{switchLink}</div>
        </nav>
      )}
    </header>
  );
}
