// 기사가 0건일 때의 안내. "뉴스 없음 / 아직 수집 안 함 / 수집 실패"를 다른 문구로 구분한다.
// 다른 날짜로 자동 이동하지 않는다(사용자가 고른 날짜를 존중).

import type { DayStatus } from "@/lib/news/types";

const MESSAGES: Record<Exclude<DayStatus, "ok">, { title: string; body: string }> = {
  empty: {
    title: "이 날짜에 수집된 서부발전 뉴스가 없어요",
    body: "수집은 정상적으로 했지만 연결된 출처에서 이 날짜로 분류된 기사를 찾지 못했어요. 위의 화살표나 달력으로 다른 날짜를 볼 수 있어요.",
  },
  not_collected: {
    title: "이 날짜는 아직 수집 기록이 없어요",
    body: "뉴스 수집을 시작하기 전 날짜이거나 아직 수집하지 않은 날짜예요. 지난 기사가 나중에 모두 채워진다고 보장할 수 없어요.",
  },
  failed: {
    title: "이 날짜의 뉴스를 가져오지 못했어요",
    body: "마지막 수집이 실패했고, 저장된 기사도 없어요. 잠시 후 다시 확인해 주세요.",
  },
};

export default function EmptyState({ status }: { status: DayStatus }) {
  const msg = MESSAGES[status === "ok" ? "empty" : status];
  return (
    <div className="flex h-72 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/60 px-6 text-center">
      <svg viewBox="0 0 24 24" className="size-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5h13v14H6a2 2 0 01-2-2V5zm13 4h3v8a2 2 0 01-2 2M8 9h5M8 13h5" />
      </svg>
      <p className="mt-4 text-lg font-bold">{msg.title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-navy-soft">{msg.body}</p>
    </div>
  );
}
