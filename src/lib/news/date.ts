// 날짜 도구 모음. 모든 날짜는 Asia/Seoul(KST) 기준으로 다룬다.
// 서버(Vercel은 UTC)와 브라우저(사용자 PC 시간대)가 달라도 같은 결과가 나오도록
// 항상 Intl 의 timeZone: "Asia/Seoul" 옵션을 쓴다.

export const TIME_ZONE = "Asia/Seoul";

/** yyyy-mm-dd 형식인지, 그리고 실제로 있는 날짜인지(2월 30일 같은 것 제외) 확인한다. */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // UTC 정오로 만들어 시간대 때문에 날짜가 하루 밀리는 일을 막는다.
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** 어떤 순간(Date)이 KST로 며칠인지 yyyy-mm-dd 로 돌려준다. */
export function toKstDateString(instant: Date): string {
  // en-CA 로케일은 날짜를 yyyy-mm-dd 형태로 찍어 준다.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** 지금 KST 날짜. */
export function todayKst(): string {
  return toKstDateString(new Date());
}

/** yyyy-mm-dd 에 n일을 더한(빼려면 음수) 날짜. 달·해 넘김도 처리된다. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + n, 12));
  return next.toISOString().slice(0, 10);
}

/** 두 날짜 문자열 비교. yyyy-mm-dd 는 글자 순서가 곧 날짜 순서라서 문자열 비교로 충분하다. */
export function compareDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "2026년 10월 27일" 과 "화요일" 을 따로 돌려준다(화면에서 크기를 다르게 쓰려고). */
export function formatKoreanDate(date: string): { dateText: string; weekday: string } {
  const [y, m, d] = date.split("-").map(Number);
  const instant = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", weekday: "long" }).format(instant);
  return { dateText: `${y}년 ${m}월 ${d}일`, weekday };
}

/** ISO 시각 → KST "오후 3:05" 형식. */
export function formatKstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** ISO 시각 → KST "10월 27일 오후 3:05" 형식. */
export function formatKstDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TIME_ZONE,
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** 달력용: 그 달 1일의 요일(0=일)과 그 달의 날 수. */
export function monthInfo(year: number, month: number): { firstWeekday: number; days: number } {
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const days = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return { firstWeekday: first.getUTCDay(), days };
}

/** 숫자 연·월·일 → yyyy-mm-dd */
export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
