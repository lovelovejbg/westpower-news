// 출처 모듈 공통 틀.
// 새 출처를 붙일 때는 이 모양대로 fetchItems 를 만들고 sources/index.ts 에 등록한다.
// 출처의 이용 조건(보관 기한, 전문·사진·요약 허락)은 DB sources 표가 기준이고, DB 트리거가 강제한다.

import type { Category, SummaryKind } from "../types";

/** 출처 모듈이 돌려주는 기사 하나. DB articles 표에 넣기 직전 모양. */
export interface CollectedItem {
  dedupKey: string;
  title: string;
  description: string | null;
  summaryKind: SummaryKind;
  press: string;
  url: string;
  portalUrl: string | null;
  category: Category;
  /** 출처가 준 발행 시각(ISO). 없으면 null → DB 가 수집일로 날짜를 정하고 표시한다. */
  publishedAt: string | null;
}

export interface FetchOptions {
  /** 이 시각보다 오래된 기사는 가져오지 않는다(보관 기한을 넘기는 저장 방지). */
  notBefore: Date;
}

export interface SourceModule {
  /** DB sources.id 와 같아야 한다. */
  id: string;
  /** 필요한 서버 환경변수 이름(값이 아님). 관리자 화면에서 빠진 것을 알려 줄 때 쓴다. */
  requiredEnv: string[];
  fetchItems(options: FetchOptions): Promise<CollectedItem[]>;
}

/** 다시 시도해 볼 만한 오류(일시적 장애)인지 표시한다. */
export class RetryableError extends Error {}
