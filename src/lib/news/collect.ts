// 수집 한 번의 전체 흐름. 호출하는 쪽(관리자 액션 · /api/collect)이 먼저 권한을 확인해야 한다.
//  1) 30분 넘게 '진행 중'인 기록은 실패로 정리
//  2) 수집 기록을 '진행 중'으로 추가 — 같은 출처가 이미 진행 중이면 DB 고유 인덱스가 막는다(동시 실행 방지)
//  3) 출처에서 가져오기 — 일시적 오류만 최대 2번 다시 시도
//  4) 새 기사만 저장(같은 dedup_key 는 건너뜀)
//  5) 기록을 '성공'(새 기사 수) 또는 '실패'(오류 내용)로 마무리

import "server-only";
import { SOURCES } from "./sources";
import { RetryableError, type CollectedItem } from "./sources/types";
import { getWriteDb } from "./supabase";

export type CollectOutcome =
  | { status: "success"; fetched: number; newCount: number }
  | { status: "failed"; error: string }
  | { status: "busy" }
  | { status: "not_configured"; missing: string[] };

const STALE_MINUTES = 30;
const RETRY_DELAYS_MS = [2_000, 5_000];
/** 장기 저장 출처라도 한 번에 너무 먼 과거까지 훑지 않는다. */
const LONG_TERM_LOOKBACK_DAYS = 7;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(task: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (e) {
      if (!(e instanceof RetryableError) || attempt >= RETRY_DELAYS_MS.length) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

function errorText(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 1000);
}

/** 지금 설정에서 빠진 환경변수 이름 목록(값은 다루지 않는다). */
export function missingCollectEnv(sourceId: string): string[] {
  const names = ["SUPABASE_URL", "SUPABASE_SECRET_KEY", ...(SOURCES[sourceId]?.requiredEnv ?? [])];
  return names.filter((name) => !process.env[name]);
}

export async function runCollection(sourceId: string): Promise<CollectOutcome> {
  const source = SOURCES[sourceId];
  if (!source) return { status: "failed", error: `등록되지 않은 출처: ${sourceId}` };

  const missing = missingCollectEnv(sourceId);
  const db = getWriteDb();
  if (missing.length > 0 || !db) return { status: "not_configured", missing };

  const { data: sourceRow, error: sourceError } = await db
    .from("sources")
    .select("storage_policy, retention_days, enabled")
    .eq("id", sourceId)
    .maybeSingle<{ storage_policy: "long_term" | "temp_cache"; retention_days: number | null; enabled: boolean }>();
  if (sourceError) return { status: "failed", error: `출처 정보 조회 실패: ${sourceError.message}` };
  if (!sourceRow) return { status: "failed", error: `DB sources 표에 '${sourceId}' 출처가 없습니다. supabase/stage3.sql 을 실행해 주세요.` };
  if (!sourceRow.enabled) return { status: "failed", error: `'${sourceId}' 출처가 사용 중지 상태입니다.` };

  // 1) 멈춘 기록 정리
  await db
    .from("collect_runs")
    .update({ status: "failed", finished_at: new Date().toISOString(), error: `${STALE_MINUTES}분 넘게 끝나지 않아 실패로 정리했습니다.` })
    .eq("source_id", sourceId)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STALE_MINUTES * 60_000).toISOString());

  // 2) 진행 중 기록 추가
  const { data: run, error: runError } = await db
    .from("collect_runs")
    .insert({ source_id: sourceId })
    .select("id")
    .single<{ id: number }>();
  if (runError) {
    if (runError.code === "23505") return { status: "busy" };
    return { status: "failed", error: `수집 기록 추가 실패: ${runError.message}` };
  }

  const finish = (fields: Record<string, unknown>) =>
    db.from("collect_runs").update({ finished_at: new Date().toISOString(), ...fields }).eq("id", run.id);

  try {
    // 3) 가져오기. 보관 기한을 넘길 만큼 오래된 기사는 처음부터 받지 않는다.
    const days = sourceRow.storage_policy === "temp_cache" ? (sourceRow.retention_days ?? 1) : LONG_TERM_LOOKBACK_DAYS;
    const notBefore = new Date(Date.now() - days * 86_400_000);
    const items = await withRetry(() => source.fetchItems({ notBefore }));

    // 같은 응답 안의 중복도 먼저 걸러 낸다.
    const unique = new Map<string, CollectedItem>();
    for (const item of items) if (!unique.has(item.dedupKey)) unique.set(item.dedupKey, item);

    // 4) 저장. kst_date · date_basis · expires_at 은 DB 트리거가 채운다.
    let newCount = 0;
    if (unique.size > 0) {
      const rows = [...unique.values()].map((item) => ({
        source_id: sourceId,
        dedup_key: item.dedupKey,
        title: item.title,
        description: item.description,
        summary_kind: item.summaryKind,
        press: item.press,
        url: item.url,
        portal_url: item.portalUrl,
        category: item.category,
        published_at: item.publishedAt,
        is_demo: false,
      }));
      const { data: inserted, error: insertError } = await db
        .from("articles")
        .upsert(rows, { onConflict: "dedup_key", ignoreDuplicates: true, defaultToNull: false })
        .select("id");
      if (insertError) throw new Error(`기사 저장 실패: ${insertError.message}`);
      newCount = inserted?.length ?? 0;
    }

    // 5) 성공
    await finish({ status: "success", new_count: newCount });
    return { status: "success", fetched: unique.size, newCount };
  } catch (e) {
    const error = errorText(e);
    console.error(`[collect:${sourceId}]`, error);
    await finish({ status: "failed", error });
    return { status: "failed", error };
  }
}
