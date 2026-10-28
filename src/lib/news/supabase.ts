// 서버 전용 Supabase 연결.
// - 읽기(getReadDb): 공개용 키(publishable). DB 의 RLS 가 "읽기만" 허용하므로 실수로 써지지 않는다.
// - 쓰기(getWriteDb): 비밀 키(secret). RLS 를 우회하므로 수집·관리자 기능에서만, 권한 확인 뒤에 쓴다.
// - 읽기 환경변수가 없으면 null → repository 가 '시연용 데이터'로 대신한다.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let readClient: SupabaseClient | null | undefined;

/** 읽기용 클라이언트. 서버 환경변수 SUPABASE_URL · SUPABASE_PUBLISHABLE_KEY 가 둘 다 있어야 한다. */
export function getReadDb(): SupabaseClient | null {
  if (readClient !== undefined) return readClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  readClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return readClient;
}

let writeClient: SupabaseClient | null | undefined;

/** 쓰기용 클라이언트. SUPABASE_URL · SUPABASE_SECRET_KEY 가 둘 다 있어야 한다. 호출 전에 반드시 권한을 확인할 것. */
export function getWriteDb(): SupabaseClient | null {
  if (writeClient !== undefined) return writeClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  writeClient = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return writeClient;
}
