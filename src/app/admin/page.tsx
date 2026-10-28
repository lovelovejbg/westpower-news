// 관리자 화면: 로그인 → '지금 수집' 버튼 + 최근 수집 기록(오류 내용 포함).
// 로그인 여부는 요청마다 쿠키로 확인하므로 <Suspense> 안에서 읽는다(Cache Components 규칙).

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { adminEnvProblems, isAdmin } from "@/lib/admin/auth";
import { missingCollectEnv } from "@/lib/news/collect";
import { formatKstDateTime } from "@/lib/news/date";
import { DEFAULT_SOURCE_ID } from "@/lib/news/sources";
import { getWriteDb } from "@/lib/news/supabase";
import { CollectButton, LoginForm, LogoutButton } from "./AdminForms";

export const metadata: Metadata = {
  title: "관리자 · 서부발전 뉴스 브리핑",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent">ADMIN</p>
          <h1 className="text-2xl font-bold">뉴스 수집 관리</h1>
        </div>
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          브리핑으로 →
        </Link>
      </header>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-white/70" />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  // 환경변수 확인 결과가 빌드 때 고정되지 않도록 요청 시점에 판단한다.
  await connection();
  const problems = adminEnvProblems();
  if (problems.length > 0) {
    return (
      <Box>
        <h2 className="font-bold">관리자 기능이 아직 설정되지 않았어요</h2>
        <p className="mt-2 text-sm text-navy-soft">서버 환경변수에 아래 값을 넣고 다시 배포해 주세요.</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Box>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Box>
        <LoginForm />
      </Box>
    );
  }

  return <Dashboard />;
}

interface RunRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failed";
  new_count: number;
  error: string | null;
}

const STATUS_TEXT: Record<RunRow["status"], { label: string; className: string }> = {
  running: { label: "진행 중", className: "bg-amber-100 text-amber-800" },
  success: { label: "성공", className: "bg-emerald-100 text-emerald-800" },
  failed: { label: "실패", className: "bg-rose-100 text-rose-800" },
};

async function Dashboard() {
  const missing = missingCollectEnv(DEFAULT_SOURCE_ID);
  const db = getWriteDb();
  const { data: runs, error } = db
    ? await db
        .from("collect_runs")
        .select("id, started_at, finished_at, status, new_count, error")
        .eq("source_id", DEFAULT_SOURCE_ID)
        .order("started_at", { ascending: false })
        .limit(30)
        .returns<RunRow[]>()
    : { data: null, error: null };

  return (
    <div className="flex flex-col gap-5">
      <Box>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">네이버 뉴스 검색 수집</h2>
            <p className="text-sm text-navy-soft">검색어 &lsquo;한국서부발전&rsquo; · 자동 수집은 매시 정각 (Supabase 예약 작업)</p>
          </div>
          <LogoutButton />
        </div>
        {missing.length > 0 ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
            서버 환경변수가 빠져 있어 수집할 수 없어요: {missing.join(", ")}
          </p>
        ) : (
          <CollectButton />
        )}
        <p className="mt-2 text-xs text-navy-soft">
          네이버 약관에 따라 기사는 처음 수집한 때부터 20일 뒤 화면에서 사라지고 삭제돼요. 수집 결과가 네이버 검색 화면과 같거나 빠짐없다고 보장하지 않아요.
        </p>
      </Box>

      <Box>
        <h2 className="mb-3 font-bold">최근 수집 기록</h2>
        {error && <p className="text-sm text-rose-700">기록을 불러오지 못했어요: {error.message}</p>}
        {runs && runs.length === 0 && <p className="text-sm text-navy-soft">아직 수집 기록이 없어요.</p>}
        {runs && runs.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {runs.map((run) => (
              <li key={run.id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TEXT[run.status].className}`}>
                    {STATUS_TEXT[run.status].label}
                  </span>
                  <time dateTime={run.started_at}>{formatKstDateTime(run.started_at)}</time>
                  {run.status === "success" && <span className="text-navy-soft">새 기사 {run.new_count}건</span>}
                </div>
                {run.error && <p className="mt-1 break-all text-xs text-rose-700">{run.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </Box>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-200/70 sm:p-7">{children}</section>;
}
