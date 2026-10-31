// 반응형 점검용 브라우저 코드. 사이트를 연 브라우저의 개발자 도구 콘솔에 붙여넣거나,
// 브라우저 자동화 도구의 "JavaScript 실행"에 넣어 쓰세요. (읽기만 함)
//
// 권장 절차: 폭을 320·360·375·414·768·1024·1280·1920 으로 바꿔 가며 새로고침 → 아래 코드 실행 → 결과 비교
//   - 한국어(/ko)와 영어(/en)를 모두, 메인과 개인정보처리방침·이용약관까지 확인
//   - 영어가 문구가 길어서 가장 먼저 깨지므로 320·360px 영어 화면이 핵심
//
// 결과 읽는 법
//   overflowPx > 0          : 화면이 옆으로 스크롤됨 (문제)
//   wide[]                  : 화면 오른쪽 밖으로 나간 요소 (가로 스크롤이 없어도 잘려 보일 수 있음)
//   heroRightGutter         : 메인 연회비 카드 오른쪽 여백(정상은 16px 안팎)
//   tablesOverflow          : 약관·처리방침 표가 본문 폭을 넘음
//   hamburger/desktopNav    : 768px 미만은 햄버거, 이상은 상단 메뉴가 보여야 함
(async () => {
  await new Promise((r) => setTimeout(r, 800));
  const vw = innerWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const wide = [...document.querySelectorAll("body *")]
    .filter((e) => visible(e) && e.getBoundingClientRect().right > vw + 1 && e.getBoundingClientRect().right >= 0 && !e.closest("[aria-hidden=true]"))
    .slice(0, 5)
    .map((e) => `${e.tagName}.${String(e.className).slice(0, 30)} right=${Math.round(e.getBoundingClientRect().right)}`);
  const hamb = document.querySelector("button[aria-controls=mobile-menu]");
  const dnav = document.querySelector("header nav");

  const hero = document.querySelector("section.relative div.relative");
  const heroRightGutter = hero ? Math.round(vw - hero.children[1].getBoundingClientRect().right) : null;

  const box = document.querySelector("main > div")?.getBoundingClientRect().right;
  const tables = [...document.querySelectorAll("table")].map((t) => Math.round(t.getBoundingClientRect().right));

  const small = [...document.querySelectorAll("a,button,summary,input:not([type=radio]):not([type=checkbox]),textarea")]
    .filter((e) => visible(e) && !e.closest("[aria-hidden=true]") && e.getBoundingClientRect().height < 36)
    .map((e) => `${e.tagName}:${(e.textContent || e.id).trim().slice(0, 14)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)
    .slice(0, 6);

  console.log({
    page: location.pathname, vw,
    overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    wide,
    heroRightGutter,
    tablesOverflow: box ? tables.some((r) => r > Math.round(box) + 1) : null,
    hamburger: hamb ? visible(hamb) : false,
    desktopNav: dnav ? visible(dnav) : false,
    smallTouchTargets: small, // 참고: 터치 대상이 36px 미만인 요소
  });
})();
