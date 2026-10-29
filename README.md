# 글로벌미디어연합(GMU) 회원가입 홈페이지

Next.js 16 + Tailwind v4. 한국어(`/ko`)·영어(`/en`) 지원, 신청 정보는 구글 시트에 저장됩니다.
전체 계획은 [개발계획.md](./개발계획.md)를 보세요. (다른 홈페이지와 코드·시트·결제 계정을 공유하지 않는 독립 프로젝트입니다.)

## 내 컴퓨터에서 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열면 됩니다. 환경변수가 없어도 화면과 신청 폼은 동작하지만, 신청 정보가 시트에 저장되지 않고 임시 접수번호(`GMU-DEV-…`)만 나옵니다.

## 환경변수

`.env.example`을 복사해 `.env.local`을 만들고 채웁니다. (`.env.local`은 git에 올라가지 않습니다)

| 이름 | 설명 |
|---|---|
| `GOOGLE_SCRIPT_URL` | 구글 Apps Script 웹앱 주소 — [설정 방법](./google-apps-script/README.md) |
| `APPLY_TOKEN` | 사이트와 Apps Script가 공유하는 비밀값 (이 사이트 전용으로 새로 생성) |
| `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER` | 계좌이체 안내에 보여 줄 은행명·계좌번호·예금주 (세 값 모두 필요, Vercel에도 등록) |
| `PG_PUBLIC_KEY` | 카드 결제창용 온라인 결제키(`pk_…`). **이 값이 있어야 카드 결제가 열립니다** |
| `PG_SECRET_KEY` | (선택) 서버 호출용 키. 비우면 `PG_PUBLIC_KEY`를 그대로 사용 |
| `PG_ENV` | `sandbox`(테스트, 기본) / `live`(운영). 운영 결제를 열 때만 `live` |
| `PG_WEBHOOK_TOKEN`, `PG_WEBHOOK_IPS` | 웹훅 보호용 비밀 토큰, 허용 IP 목록 (권장) |

## Vercel 배포

1. 이 폴더를 GitHub 저장소로 올립니다. (상위 `homepage` 저장소에 함께 둔다면 아래 3번에서 Root Directory를 `3_GMU_Membership`으로 지정)
2. [vercel.com](https://vercel.com)에서 **Add New → Project**로 저장소를 가져옵니다. Framework는 Next.js로 자동 인식됩니다.
3. **Environment Variables**에 `GOOGLE_SCRIPT_URL`, `APPLY_TOKEN`을 등록하고 **Deploy**합니다.
4. 배포가 끝나면 `https://프로젝트명.vercel.app`으로 접속됩니다. 자체 도메인은 나중에 **Settings → Domains**에서 연결합니다.

배포 후 확인할 것
- [ ] `/`로 접속하면 브라우저 언어에 맞는 `/ko` 또는 `/en`으로 이동한다
- [ ] 신청서를 한 번 제출하면 시트의 `신청내역`에 `결제대기`로 한 줄이 생긴다 (확인 후 테스트 행은 삭제)
- [ ] 푸터의 사업자 정보·주소가 맞다 (`lib/site.ts`, `lib/i18n/ko.ts`·`en.ts`의 `brand`)
- [ ] 통신판매업 신고번호를 받았다면 `lib/site.ts`의 `mailOrderNo`에 입력

## 계좌이체(무통장입금) — 현재 열려 있는 결제 방법

신청 → 입금 안내 화면(은행·계좌·예금주·금액·입금자명) → 운영자가 입금 확인 후 시트에서 `결제완료`로 변경하는 흐름입니다. 운영 방법은 [google-apps-script/README.md](./google-apps-script/README.md)에 있습니다.

- 입금 계좌는 환경변수(`BANK_*`)로 받습니다. 값이 없으면 "입금 계좌는 이메일·전화로 안내" 문구가 나옵니다.
- 카드 결제는 `PG_PUBLIC_KEY`가 설정되기 전까지 "준비 중"으로 막혀 있고, 서버도 카드 선택을 접수하지 않습니다.

## 카드 결제 (건흥페이먼츠 PG, "올고") — 코드 완료, 결제키 대기

**온라인 인증 결제 "2단계 승인"** 방식입니다. 금액은 브라우저가 아니라 서버(시트 저장값)가 정하고, 서버가 확인한 뒤에만 승인합니다. PG 문서는 `PG/` 폴더에 있습니다(저장소에는 올라가지 않음). 검토 내용은 [PG_연동_검토.md](./PG_연동_검토.md)를 보세요.

| 구성 | 위치 | 상태 |
|---|---|---|
| PG 승인·조회 호출 (`/api/pay/confirm`, `/api/get`) | `lib/payment.ts` | ✅ 구현 (가짜 PG로 시험) |
| 승인 확인 API (금액 대조, 중복 승인 방지, 시트 갱신) | `app/api/payment/confirm/route.ts` | ✅ |
| 웹훅 수신 (결제 누락 방지, PG에서 한 취소를 `환불`로 반영) | `app/api/payment/webhook/route.ts` | ✅ |
| 결제창 호출 (`MARU.authPay`) | `components/CardPay.tsx` | ✅ |
| 시트 조회·갱신 (`get_order`, `mark_paid`) | `lib/sheet.ts`, `google-apps-script/Code.gs` | ✅ (스크립트 재배포 필요) |
| **실제 PG 연결 시험(sandbox)** | — | ⏳ 테스트 결제키 대기 (PC·모바일 카드 앱 포함) |

**결제키를 받은 뒤 할 일**
1. `.env.local`(그리고 Vercel 환경변수)에 `PG_PUBLIC_KEY`를 넣고 `PG_ENV=sandbox`로 둡니다.
2. 웹훅 보호용으로 `PG_WEBHOOK_TOKEN`(길고 추측하기 어려운 문자열)을 정하고, PG에는 `https://gmu-membership.vercel.app/api/payment/webhook?k=<토큰>` 주소를 NOTI 수신 주소로 등록 요청합니다. PG가 알려 준 웹훅 발송 IP가 있으면 `PG_WEBHOOK_IPS`에도 넣습니다.
3. 재배포 후 테스트 결제 → 취소 → 시트 `결제완료`/`환불` 반영을 확인합니다. (결제키가 있으면 카드 안내 문구가 자동으로 바뀝니다)
4. 문제가 없으면 운영용 결제키로 바꾸고 `PG_ENV=live`로 한 뒤, 소액 실결제와 취소로 최종 확인합니다.

**웹훅 동작 요약**: PG는 결제·취소 때 POST로 알리고 응답 본문이 정확히 `OK`(HTTP 200)여야 합니다. 이 사이트는 결제(`PAY`) 알림을 받으면 내용을 믿지 않고 PG 조회 API로 다시 확인한 뒤에만 시트에 `결제완료`를 기록하고, 취소(`REFUND`) 알림은 토큰 또는 IP 허용 목록이 설정된 경우에만 `환불`로 반영합니다. 일시적 오류에는 500으로 응답해 PG가 재전송하게 합니다.
