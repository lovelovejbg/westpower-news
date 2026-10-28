// 사용 중인 출처 모듈 목록. 새 출처는 DB sources 표에 이용 조건을 등록한 뒤 여기에 추가한다.

import "server-only";
import { naverSource } from "./naver";
import type { SourceModule } from "./types";

export const SOURCES: Record<string, SourceModule> = {
  [naverSource.id]: naverSource,
};

/** 자동 수집 대상 */
export const DEFAULT_SOURCE_ID = naverSource.id;
