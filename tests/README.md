# 시험·점검 도구

이 폴더의 도구는 **실제 구글 시트·PG·결제에 아무것도 보내지 않고** 동작을 확인하도록 만든 것입니다.
(개발 중에 임시로 쓰던 도구를 저장소에 정리한 것이며, 같은 사이트를 다시 만들 때도 그대로 쓸 수 있습니다.)

| 도구 | 위치 | 무엇을 확인하나 | 실행 |
|---|---|---|---|
| Apps Script 시험 | `tests/apps-script/` | `Code.gs`를 **가짜 스프레드시트** 위에서 실행: 결제수단 열·드롭다운·결제일시 자동 기록(onEdit)·예전 시트 호환(15 checks), 30일 자동 파기·미리보기·트리거·시험 행 삭제(14 checks) | `npm run test:apps-script` |
| 카드 결제(PG) 시험 | `tests/pg/` | **가짜 PG + 가짜 시트 서버**로 승인 API(26)·웹훅(15)·설정별 동작과 요청 제한(14) | `npm run test:pg` |
| SEO 점검 | `tests/seo-audit.mjs` | 페이지별 title·description·canonical·hreflang·OG·아이콘·JSON-LD, robots.txt·sitemap.xml 응답 (읽기만 함) | `npm run audit:seo` (또는 `node tests/seo-audit.mjs https://주소`) |
| 반응형 점검 | `tests/responsive-check.js` | 브라우저에서 폭별 가로 넘침·잘린 요소·표·메뉴 전환 측정 | 브라우저 콘솔에 붙여넣기 (파일 맨 위 설명 참고) |

## 카드 결제(PG) 시험 자세히
- 한 번에 실행: `npm run test:pg` → 빌드 → 가짜 서버(기본 4010) + 앱 서버 5대(기본 3191~3195) 시작 → 시험 3묶음 → 서버 정리.
- 서버 5대는 설정이 서로 다릅니다: A 전체 설정(웹훅 토큰) / B 웹훅 보호 없음 / C IP 허용 목록만 / D 결제키 없음 / E PG 연결 불가.
- 이미 빌드해 둔 경우 `node tests/pg/run-all.mjs --no-build`.
- 포트가 겹치면 `PORT_BASE=3290 MOCK_PORT=4110 npm run test:pg`처럼 바꾸세요. 사용 중인 포트를 만나면 **시작하지 않고** 알려 줍니다(다른 프로젝트의 서버를 건드리지 않기 위해).
- **빌드가 `.next`를 새로 만들므로** 이 프로젝트의 `next dev`가 떠 있다면 먼저 끄세요.
- 가짜 PG의 토큰 시나리오(`tests/pg/mock-servers.mjs` 맨 위 설명): `pat_ok`(승인), `pat_declined`(카드사 거절), `pat_expired`(만료), `pat_confirming`(처리 중), `pat_already`(이미 승인), `pat_wrongamount`/`pat_wrongtrack`/`pat_nothrx`(승인 응답이 잘못됨), `pat_500`(PG 서버 오류).
- 시험에서 쓰는 결제키·웹훅 토큰(`pk_test_mock`, `whtoken`)은 **가짜 값**입니다. 실제 결제키는 절대 이 폴더에 적지 마세요.

## 시험할 때 겪었던 함정
- 터미널(Git Bash)의 `curl -d`로 한글을 보내면 CP949로 깨집니다 → Node `fetch`를 쓰세요(이 폴더의 시험이 그렇게 되어 있음).
- 접수 API는 IP당 10분에 5건까지만 받습니다 → 시험은 요청마다 다른 `x-forwarded-for`를 보냅니다.
- 결제 토큰은 8자 미만이면 서버가 PG로 보내지 않습니다 → 시험 토큰은 `pat_ok_0000000000`처럼 길이를 맞춥니다.
- Windows는 빈 값의 환경변수를 지워 버려 `.env.local` 값이 되살아납니다 → "꺼짐"은 공백 한 칸(`" "`)으로 표시합니다. (서버 코드는 모두 `trim()` 후 읽음)

## 생성 도구 (`scripts/`)
| 파일 | 하는 일 | 실행 |
|---|---|---|
| `make-og-image.cjs` | 링크 미리보기 이미지 `public/og-image.png`(1200×630, 로고 전체가 가운데) | `node scripts/make-og-image.cjs` (`OUT=경로`로 다른 곳에 만들어 비교 가능) |
| `make-icons.cjs` | `app/icon.png`(192), `apple-icon.png`(180), `favicon.ico`(16·32·48) | `node scripts/make-icons.cjs` (`OUT_DIR=폴더`로 비교 가능) |
| `docx2txt.py` | `.docx`(예: PG 연동 문서)의 본문·표를 텍스트로 추출 | `python -I scripts/docx2txt.py <폴더> <출력폴더>` |

`sharp`(이미지 도구)는 Next.js가 함께 설치합니다. 없다면 `npm i -D sharp`.
