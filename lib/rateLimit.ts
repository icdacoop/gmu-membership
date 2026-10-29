// 같은 IP 가 짧은 시간에 너무 많이 요청하는 것을 막는 간단한 제한. (서버리스 특성상 완전한 방어는 아니고 단순 반복 방지용)
const buckets = new Map<string, number[]>();

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// name 별로 따로 세고, windowMs 안에 max 번을 넘으면 true 를 돌려줍니다.
export function tooMany(name: string, ip: string, max: number, windowMs: number) {
  const key = `${name}:${ip}`;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}
