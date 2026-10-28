// 첫 화면 ( / 또는 /?date=2026-10-27 )
//
// Next.js 16 의 Cache Components 규칙:
//  - 제목처럼 요청과 무관한 부분은 미리 만들어 둔 "정적 껍데기"로 바로 보낸다.
//  - 주소의 ?date 나 '지금 시각'처럼 요청마다 다른 값은 <Suspense> 안에서 읽는다.
//    그동안은 fallback(뼈대 화면)이 보인다.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import NewsBriefing from "@/components/NewsBriefing";
import { compareDate, isValidDateString, todayKst } from "@/lib/news/date";
import { getNewsForDate } from "@/lib/news/repository";

export default function Page(props: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-accent">KOREA WESTERN POWER</p>
        <h1 className="mt-1 text-base font-bold text-navy-soft">서부발전 뉴스 브리핑</h1>
      </header>

      <Suspense fallback={<BriefingSkeleton />}>
        <Briefing searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

/** 주소의 날짜를 확인하고 그날 뉴스를 불러와 화면에 넘긴다(서버에서 실행). */
async function Briefing({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  // '오늘'은 요청할 때마다 다시 계산해야 하므로 요청 시점까지 기다린다.
  await connection();
  const today = todayKst();

  const raw = (await searchParams).date;
  const value = Array.isArray(raw) ? raw[0] : raw;

  // 잘못된 날짜나 미래 날짜가 주소에 들어오면 오늘로 보낸다.
  if (value !== undefined && (!isValidDateString(value) || compareDate(value, today) > 0)) {
    redirect("/");
  }
  const date = value ?? today;
  const day = await getNewsForDate(date);

  return <NewsBriefing day={day} today={today} />;
}

/** 처음 불러오는 동안 보이는 뼈대 화면(날짜·카드 자리를 미리 잡아 화면이 덜컹거리지 않게). */
function BriefingSkeleton() {
  return (
    <div className="flex animate-pulse flex-col items-center gap-5" aria-label="불러오는 중" role="status">
      <div className="h-11 w-64 rounded-2xl bg-slate-200" />
      <div className="h-6 w-20 rounded-full bg-slate-200" />
      <div className="h-5 w-56 rounded-full bg-slate-200" />
      <div className="mt-2 h-[25rem] w-full rounded-3xl bg-white shadow-card" />
    </div>
  );
}
