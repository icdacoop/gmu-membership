// 계좌이체(무통장입금) 안내에 쓰는 입금 계좌. 코드에 적지 않고 환경변수로 받습니다.
// (바꿀 때 코드를 고치지 않고 Vercel 환경변수만 수정한 뒤 재배포하면 됩니다.)

export type BankInfo = { name: string; account: string; holder: string };

// 세 값이 모두 있을 때만 계좌 안내를 보여 줍니다. 하나라도 없으면 null.
export function getBankInfo(): BankInfo | null {
  const name = process.env.BANK_NAME?.trim();
  const account = process.env.BANK_ACCOUNT?.trim();
  const holder = process.env.BANK_HOLDER?.trim();
  return name && account && holder ? { name, account, holder } : null;
}
