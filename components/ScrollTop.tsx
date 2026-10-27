"use client";

import { useEffect } from "react";

// 홈페이지에 접속(처음 열기·새로고침·뒤로가기로 돌아오기)하면 항상 맨 위(첫 화면)에서 시작합니다.
// 브라우저는 새로고침하면 마지막에 보던 위치를 기억해 그 자리에서 열기 때문에 이를 끕니다.
// 사이트 안에서 메뉴를 눌러 이동하는 동작은 이 컴포넌트가 다시 실행되지 않으므로 영향이 없습니다.
export default function ScrollTop() {
  useEffect(() => {
    function toTop() {
      // 주소에 #apply 같은 앵커가 붙어 있어도 첫 화면으로 열리도록 앵커를 지웁니다.
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    } catch {
      // 설정할 수 없는 환경에서는 아래 scrollTo 만 적용됩니다.
    }
    toTop();

    // 글꼴·이미지가 늘어나며 위치가 몇 픽셀 밀리거나, 앵커 이동 애니메이션이 남는 경우를 한 번 더 바로잡습니다.
    // (사용자가 이미 스크롤을 내렸다면 건드리지 않습니다.)
    const settle = () => {
      if (window.scrollY < 200) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    const timer = window.setTimeout(settle, 200);
    if (document.readyState !== "complete") window.addEventListener("load", settle, { once: true });

    // 다른 사이트에서 뒤로가기로 돌아올 때(브라우저가 페이지를 그대로 복원하는 경우)도 맨 위로 보냅니다.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) toTop();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", settle);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
