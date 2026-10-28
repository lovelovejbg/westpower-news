// 자동 수집 주소. Supabase 예약 작업(pg_cron)이 매시간 POST 로 부른다.
// Authorization: Bearer <CRON_SECRET> 이 맞을 때만 수집한다. (관리자 화면의 '지금 수집'은 서버 액션을 쓴다)

import { isValidCronRequest } from "@/lib/admin/auth";
import { runCollection } from "@/lib/news/collect";
import { DEFAULT_SOURCE_ID } from "@/lib/news/sources";

export async function POST(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }

  const outcome = await runCollection(DEFAULT_SOURCE_ID);
  // 오류 원문은 DB 수집 기록(관리자 화면)에만 남기고, 응답에는 상태만 돌려준다.
  const body =
    outcome.status === "success"
      ? { status: "success", fetched: outcome.fetched, newCount: outcome.newCount }
      : { status: outcome.status };
  const code = outcome.status === "success" ? 200 : outcome.status === "busy" ? 409 : 500;
  return Response.json(body, { status: code });
}
