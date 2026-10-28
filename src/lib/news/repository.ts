// 날짜별 뉴스 조회.
// - DB 환경변수가 있으면 Supabase 에서만 읽는다(시연용 데이터를 절대 섞지 않는다).
// - 없으면 시연용 데이터로 대신한다(화면에 '시연용 데이터'로 표시됨).

import "server-only";
import { getDemoDay } from "./demo-data";
import { getReadDb } from "./supabase";
import type { Article, Category, DateBasis, DayResult, DayStatus, SummaryKind } from "./types";

/** DB articles 행(필요한 칸만) */
interface ArticleRow {
  id: string;
  source_id: string;
  dedup_key: string;
  title: string;
  description: string | null;
  summary_kind: SummaryKind;
  key_points: string[] | null;
  full_text: string | null;
  press: string;
  url: string;
  image_url: string | null;
  image_allowed: boolean;
  category: Category;
  published_at: string | null;
  first_collected_at: string;
  kst_date: string;
  date_basis: DateBasis;
  is_demo: boolean;
  sources: { label: string } | null;
}

/** DB collect_runs 행(공개된 칸만 — error 는 공개하지 않는다) */
interface RunRow {
  status: "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
}

const ARTICLE_COLUMNS =
  "id, source_id, dedup_key, title, description, summary_kind, key_points, full_text, press, url, " +
  "image_url, image_allowed, category, published_at, first_collected_at, kst_date, date_basis, is_demo, " +
  "sources(label)";

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    summaryKind: row.summary_kind,
    keyPoints: row.key_points ?? [],
    fullText: row.full_text,
    press: row.press,
    url: row.url,
    imageUrl: row.image_url,
    imageAllowed: row.image_allowed,
    category: row.category,
    publishedAt: row.published_at,
    firstCollectedAt: row.first_collected_at,
    source: row.source_id,
    sourceLabel: row.sources?.label ?? row.source_id,
    dedupKey: row.dedup_key,
    kstDate: row.kst_date,
    dateBasis: row.date_basis,
    isDemo: row.is_demo,
  };
}

/**
 * 그 날짜의 상태 판단
 * - 기사 있음 → ok (단, 그날 마지막으로 끝난 수집이 실패면 failed: 저장된 기사는 그대로 보여 줌)
 * - 기사 없음 + 그날 성공한 수집 있음 → empty (정상 수집했지만 해당 기사 없음)
 * - 기사 없음 + 실패한 수집만 있음 → failed
 * - 수집 기록 없음 → not_collected
 */
function decideStatus(articleCount: number, runs: RunRow[]): DayStatus {
  const finished = runs.filter((r) => r.status !== "running"); // 최신순
  const latest = finished[0];
  if (articleCount > 0) return latest?.status === "failed" ? "failed" : "ok";
  if (finished.some((r) => r.status === "success")) return "empty";
  if (latest?.status === "failed") return "failed";
  return "not_collected";
}

export async function getNewsForDate(date: string): Promise<DayResult> {
  const db = getReadDb();
  if (!db) return getDemoDay(date);

  // 기사와 수집 기록을 동시에 조회
  const [articlesRes, runsRes] = await Promise.all([
    db
      .from("articles")
      .select(ARTICLE_COLUMNS)
      .eq("kst_date", date)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("first_collected_at", { ascending: false })
      .returns<ArticleRow[]>(),
    db
      .from("collect_runs")
      .select("status, started_at, finished_at")
      .eq("kst_date", date)
      .order("started_at", { ascending: false })
      .returns<RunRow[]>(),
  ]);

  // 조회 자체가 실패하면 오류 화면(error.tsx)으로 보낸다. 상세 내용은 서버 로그에만 남긴다.
  if (articlesRes.error || runsRes.error) {
    console.error("[news] DB 조회 실패", articlesRes.error ?? runsRes.error);
    throw new Error("뉴스 DB 조회에 실패했습니다.");
  }

  const articles = (articlesRes.data ?? []).map(toArticle);
  const runs = runsRes.data ?? [];
  const status = decideStatus(articles.length, runs);
  const lastSuccess = runs.find((r) => r.status === "success" && r.finished_at);

  return {
    date,
    articles,
    status,
    lastCollectedAt: lastSuccess?.finished_at ?? null,
    // 실패 원인 원문(error 칸)은 공개 키로 읽을 수 없다. 관리자 화면(3단계)에서만 보여 준다.
    errorMessage: null,
    dataMode: "db",
  };
}
