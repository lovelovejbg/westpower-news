"use client";

// 화면 전체를 묶는 컴포넌트.
//  ┌ DateNav        날짜 탐색 (URL ?date=yyyy-mm-dd 로 반영)
//  ├ CollectStatus  기사 수 · 마지막 수집 · 시연용 표시
//  └ ArticleViewer  겹친 카드 + 상세 보기 (날짜가 바뀌면 새로 시작 → 1번째 카드부터)
//
// 날짜를 바꾸면 router.push 로 주소를 바꾸고, 서버가 그 날짜 데이터를 다시 보내 준다.
// 기다리는 동안(isPending) 고른 날짜를 먼저 보여 주고 카드 영역을 흐리게 한다.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayResult } from "@/lib/news/types";
import CardStack from "./CardStack";
import CollectStatus from "./CollectStatus";
import DateNav from "./DateNav";
import DetailModal from "./DetailModal";
import EmptyState from "./EmptyState";

export default function NewsBriefing({ day, today }: { day: DayResult; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 서버 응답을 기다리는 동안 화면 위쪽에 먼저 보여 줄 날짜
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const shownDate = isPending && pendingDate ? pendingDate : day.date;

  function changeDate(next: string) {
    setPendingDate(next);
    startTransition(() => {
      // scroll:false → 날짜를 바꿔도 스크롤이 맨 위로 튀지 않게
      router.push(`/?date=${next}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <DateNav date={shownDate} today={today} onChange={changeDate} />

      <div className={`flex w-full flex-col items-center gap-6 transition-opacity ${isPending ? "pointer-events-none opacity-50" : ""}`} aria-busy={isPending}>
        <CollectStatus day={day} />
        <ArticleViewer key={day.date} day={day} />
      </div>
      {isPending && <p className="sr-only" role="status">기사를 불러오는 중이에요</p>}
    </div>
  );
}

/** 카드 묶음과 상세 보기. 보고 있는 카드 번호와 상세 열림 여부를 관리한다. */
function ArticleViewer({ day }: { day: DayResult }) {
  const [index, setIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailButtonRef = useRef<HTMLButtonElement>(null);

  if (day.articles.length === 0) return <EmptyState status={day.status} />;

  return (
    <>
      <CardStack
        articles={day.articles}
        index={index}
        onIndexChange={setIndex}
        onOpenDetail={() => setDetailOpen(true)}
        detailButtonRef={detailButtonRef}
      />
      <DetailModal
        article={detailOpen ? day.articles[index] : null}
        onClose={() => {
          setDetailOpen(false);
          // 닫힌 뒤 보던 카드의 상세 버튼으로 초점을 돌려준다(키보드 사용자가 길을 잃지 않게).
          requestAnimationFrame(() => detailButtonRef.current?.focus());
        }}
      />
    </>
  );
}
