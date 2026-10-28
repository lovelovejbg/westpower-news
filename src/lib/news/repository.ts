// 하루치 뉴스를 "어디서" 가져올지 정하는 곳.
// 화면은 이 함수만 부르므로, 2단계에서 Supabase 조회를 붙여도 화면 코드는 바뀌지 않는다.
//
// 지금(1단계)은 DB가 연결되지 않았으므로 '시연용 데이터'를 돌려주고,
// dataMode: "demo" 로 표시해서 화면이 실제 데이터인 척하지 않게 한다.

import "server-only"; // 이 파일이 실수로 브라우저 번들에 들어가면 빌드 에러가 나게 한다.
import { getDemoDay } from "./demo-data";
import type { DayResult } from "./types";

export async function getNewsForDate(date: string): Promise<DayResult> {
  // TODO(2단계): SUPABASE_URL 등 서버 환경변수가 있으면 DB에서 조회하고,
  //              없을 때만 시연용 데이터로 대체한다.
  return getDemoDay(date);
}
