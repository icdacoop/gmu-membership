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
| `PG_MERCHANT_ID`, `PG_SECRET_KEY` | 올고에서 받는 상점 정보 (결제 연동 후 사용) |

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

## 결제(올고) 연동 상태

PG와 무관한 부분은 준비되어 있습니다.

| 구성 | 위치 | 상태 |
|---|---|---|
| 결제 확인 API (시트 금액과 대조, 중복 승인 방지, 시트 갱신) | `app/api/payment/confirm/route.ts` | ✅ 완료 |
| 결제 성공·실패 페이지 | `app/[lang]/payment/success`, `fail` | ✅ 완료 |
| 시트 조회·갱신 (`get_order`, `mark_paid`) | `lib/sheet.ts`, `google-apps-script/Code.gs` | ✅ 완료 (스크립트 재배포 필요) |
| **올고 승인 API 호출** | `lib/payment.ts`의 `confirmWithProvider()` | ⏳ 올고 사양 대기 |
| **결제창 호출**(신청 완료 화면의 결제 버튼) | `components/ApplyForm.tsx` | ⏳ 올고 사양 대기 |
| 결제 사용 스위치 | `lib/payment.ts`의 `isPaymentReady()` | ⏳ 연동 후 `true` |

올고 연동 가이드를 받으면 위 세 곳을 채우고, PG 결제창이 돌려보내는 값의 이름(`orderId`, `amount` 등)에 맞춰 `app/[lang]/payment/success/page.tsx`를 조정합니다.
