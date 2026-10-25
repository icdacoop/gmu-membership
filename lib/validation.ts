import { z } from "zod";
import type { Dict } from "./i18n";

// 브라우저(입력 중 안내)와 서버(최종 검증)가 같은 규칙을 씁니다. 안내 문구는 언어별 사전(validation)에서 가져옵니다.

export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("02")) {
    // 서울 지역번호
    return d.length <= 9
      ? d.replace(/^(02)(\d{3})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-"))
      : d.replace(/^(02)(\d{4})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-"));
  }
  if (d.length <= 10) {
    return d.replace(/^(\d{3})(\d{3,4})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-"));
  }
  return d.replace(/^(\d{3})(\d{4})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-"));
}

function createApplySchema(m: Dict["validation"]) {
  const phone = z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => /^0\d{8,10}$/.test(v), m.phone)
    .transform(formatPhone);

  const email = z.string().trim().pipe(z.email(m.email)).pipe(z.string().max(100));

  const interest = z.string().trim().min(2, m.interest).max(300, m.interestMax);

  const consent = z.literal(true, { error: m.consent });

  // 사람이 아닌 프로그램이 채우는 숨김 칸. 값이 있는지는 API 에서 확인합니다.
  const website = z.string().max(200).optional();

  const individual = z.object({
    memberType: z.literal("individual"),
    name: z.string().trim().min(2, m.name).max(30, m.nameMax),
    phone,
    email,
    interest,
    consent,
    website,
  });

  const corporate = z.object({
    memberType: z.literal("corporate"),
    companyName: z.string().trim().min(1, m.company).max(60, m.companyMax),
    ceoName: z.string().trim().min(2, m.ceo).max(30, m.ceoMax),
    phone,
    email,
    interest,
    consent,
    website,
  });

  return z.discriminatedUnion("memberType", [individual, corporate]);
}

export type ApplyInput = z.infer<ReturnType<typeof createApplySchema>>;

export type ValidationResult =
  | { ok: true; data: ApplyInput }
  | { ok: false; errors: Record<string, string> };

export function validateApplication(raw: unknown, messages: Dict["validation"]): ValidationResult {
  const parsed = createApplySchema(messages).safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
