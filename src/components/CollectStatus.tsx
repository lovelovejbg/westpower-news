// 날짜 아래 한 줄: 기사 수 · 마지막(성공한) 수집 시각 · 데이터 종류(시연용/실제)
// 수집 실패면 아래에 안내 상자를 덧붙인다(저장된 기사는 그대로 보인다는 점을 함께 알린다).

import { formatKstDateTime } from "@/lib/news/date";
import type { DayResult } from "@/lib/news/types";

export default function CollectStatus({ day }: { day: DayResult }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-navy-soft">
        <span>
          기사 <strong className="text-base text-navy">{day.articles.length}</strong>건
        </span>
        <span aria-hidden="true" className="text-slate-300">|</span>
        <span>
          마지막 수집{" "}
          {day.lastCollectedAt ? (
            <time dateTime={day.lastCollectedAt} className="font-medium text-navy">
              {formatKstDateTime(day.lastCollectedAt)}
            </time>
          ) : (
            <span className="font-medium">기록 없음</span>
          )}
        </span>
        {day.dataMode === "demo" && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
            시연용 데이터 · 실제 기사 아님
          </span>
        )}
      </p>

      {day.status === "failed" && (
        <p className="max-w-lg rounded-xl bg-rose-50 px-4 py-2 text-center text-sm text-rose-800 ring-1 ring-rose-200">
          {day.lastCollectedAt ? "위 시각 이후의 뉴스 수집에 실패했어요." : "뉴스 수집에 실패했어요."}
          {day.articles.length > 0 && " 이전에 저장된 기사는 그대로 보여 드려요."}
          {day.errorMessage && <span className="mt-0.5 block text-xs text-rose-700/80">{day.errorMessage}</span>}
        </p>
      )}
    </div>
  );
}
