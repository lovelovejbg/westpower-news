// 뉴스 브리핑 앱 전체에서 쓰는 데이터 모양(타입) 정의.
// DB 표(articles)의 열과 1:1로 맞추되, 화면에서 쓰기 쉬운 camelCase 이름을 쓴다.

/** 기사 분류. 카드 앞면의 태그 색·아이콘이 이 값으로 정해진다. */
export type Category = "경영" | "안전" | "에너지전환" | "사회공헌" | "지역" | "기타";

/**
 * 요약 칸에 들어 있는 글이 "무엇"인지.
 * - snippet: 검색 API가 준 짧은 발췌문. 요약이 아니므로 화면에서 '발췌'라고 표시한다.
 * - licensed: 이용 허락을 받은 출처가 제공한 요약·설명.
 * - demo: 시연용으로 지어낸 문장(실제 사실 아님).
 * - none: 요약 없음.
 */
export type SummaryKind = "snippet" | "licensed" | "demo" | "none";

/** 날짜 칸(kstDate)을 무엇으로 정했는지. 발행시각이 없으면 수집일을 쓰고 그 사실을 표시한다. */
export type DateBasis = "published" | "collected";

export interface Article {
  id: string;
  title: string;
  /** 카드 앞면에 보이는 짧은 설명(요약 또는 발췌). 없으면 null. */
  description: string | null;
  summaryKind: SummaryKind;
  /** 핵심 내용 목록. 허락된 출처만 채운다. 지어내지 않는다. */
  keyPoints: string[];
  /** 전문. 전문 이용이 허락된 출처만 채운다. */
  fullText: string | null;
  press: string;
  /** 언론사 원문 주소 */
  url: string;
  /** 포털(예: 네이버 뉴스)에서 같은 기사를 보는 주소. 원문 주소와 같거나 없으면 null. */
  portalUrl: string | null;
  /** 이미지 주소와, 그 이미지를 화면에 써도 되는지 여부. 둘 다 참일 때만 사진을 보여 준다. */
  imageUrl: string | null;
  imageAllowed: boolean;
  category: Category;
  /** 발행 시각(ISO 문자열). 출처가 주지 않으면 null. */
  publishedAt: string | null;
  /** 우리 시스템이 처음 수집한 시각(ISO 문자열). */
  firstCollectedAt: string;
  /** 출처 모듈 id (예: "demo", "naver") 와 화면 표시용 이름. */
  source: string;
  sourceLabel: string;
  /** 같은 기사 판별용 키. 출처 + 정규화한 원문 주소로 만든다. */
  dedupKey: string;
  /** KST 기준 날짜(yyyy-mm-dd)와 그 기준. */
  kstDate: string;
  dateBasis: DateBasis;
  /** 시연용 데이터면 true. 실제 데이터와 절대 섞지 않는다. */
  isDemo: boolean;
}

/**
 * 하루치 조회 상태. "뉴스 없음 / 아직 수집 안 함 / 수집 실패"를 구분한다.
 * - ok: 기사가 있음
 * - empty: 수집은 했는데 그날 기사가 없음
 * - not_collected: 그날을 수집한 기록이 없음 (과거 기사를 다 채울 수 있다고 가정하지 않는다)
 * - failed: 마지막 수집이 실패함 (저장된 기사가 있으면 그대로 보여 준다)
 */
export type DayStatus = "ok" | "empty" | "not_collected" | "failed";

/** 데이터를 어디서 가져왔는지. demo면 화면에 '시연용 데이터'를 크게 표시한다. */
export type DataMode = "demo" | "db";

export interface DayResult {
  date: string;
  articles: Article[];
  status: DayStatus;
  /** 마지막 수집 시각(ISO). 수집 기록이 없으면 null. */
  lastCollectedAt: string | null;
  /** 수집 실패 시 사용자에게 보여 줄 짧은 설명. */
  errorMessage: string | null;
  dataMode: DataMode;
}
