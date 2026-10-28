// 관리자 권한 확인 (서버 전용).
// - 관리자 비밀번호: 서버 환경변수 ADMIN_PASSWORD 와 비교한다(시간 차이로 추측하지 못하게 고정 시간 비교).
// - 로그인 상태: "만료시각.서명" 쿠키. 서명은 ADMIN_SESSION_SECRET 으로 만든 HMAC 이라 위조할 수 없다.
// - 자동 수집 호출: Authorization: Bearer <CRON_SECRET>.
// 권한이 필요한 모든 서버 액션 · 라우트에서 매번 다시 확인한다(화면에서 버튼을 숨기는 것만으로는 보호가 안 됨).

import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "wp_admin";
export const SESSION_HOURS = 12;
/** 짧은 비밀 값은 쓰지 않는다(무작위 대입 방지). */
const MIN_SECRET_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 10;

function sameText(a: string, b: string): boolean {
  // 길이가 달라도 같은 시간이 걸리도록 해시끼리 비교한다.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function sessionSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= MIN_SECRET_LENGTH ? s : null;
}

/** 관리자 로그인에 필요한 환경변수 중 빠졌거나 너무 짧은 것(이름만). */
export function adminEnvProblems(): string[] {
  const problems: string[] = [];
  if ((process.env.ADMIN_PASSWORD ?? "").length < MIN_PASSWORD_LENGTH) problems.push(`ADMIN_PASSWORD (${MIN_PASSWORD_LENGTH}자 이상)`);
  if (!sessionSecret()) problems.push(`ADMIN_SESSION_SECRET (${MIN_SECRET_LENGTH}자 이상)`);
  return problems;
}

export function checkPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  return sameText(input, password);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** 새 로그인 쿠키 값. */
export function createSessionToken(): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const expires = String(Date.now() + SESSION_HOURS * 3_600_000);
  return `${expires}.${sign(expires, secret)}`;
}

function verifySessionToken(token: string | undefined): boolean {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (!sameText(signature, sign(expires, secret))) return false;
  return Number(expires) > Date.now();
}

/** 지금 요청이 관리자 로그인 상태인지. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** 자동 수집 호출(Supabase 예약 작업)의 토큰이 맞는지. */
export function isValidCronRequest(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH || !authorization?.startsWith("Bearer ")) return false;
  return sameText(authorization.slice("Bearer ".length), secret);
}
