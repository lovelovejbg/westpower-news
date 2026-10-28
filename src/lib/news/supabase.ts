// 서버 전용 Supabase 연결.
// - 읽기에는 공개용 키(publishable)를 쓴다. DB 의 RLS 가 "읽기만" 허용하므로 실수로 써지지 않는다.
// - 쓰기(수집)용 secret 키는 3단계에서 별도 함수로 만든다. 여기서 쓰지 않는다.
// - 환경변수가 없으면 null → repository 가 '시연용 데이터'로 대신한다.

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
