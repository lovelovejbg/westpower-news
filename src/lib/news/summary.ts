// 요약 칸 제목과 안내문. 카드와 상세 보기가 같은 규칙을 쓴다.
// 검색 발췌(snippet)를 '요약'처럼 보이게 하지 않는 것이 핵심.

import type { SummaryKind } from "./types";

export const SUMMARY_LABEL: Record<SummaryKind, { title: string; note: string | null }> = {
  licensed: { title: "요약", note: null },
  snippet: { title: "검색 결과 발췌", note: "검색 서비스가 제공한 짧은 발췌문으로, 기사 전체를 요약한 글이 아닙니다." },
  demo: { title: "시연용 설명", note: "화면 시연을 위해 만든 문장입니다. 실제 기사 내용이 아닙니다." },
  none: { title: "요약", note: null },
};
