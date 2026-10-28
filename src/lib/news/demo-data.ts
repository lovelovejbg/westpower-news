// '시연용 데이터' 생성기.
// ⚠️ 여기 있는 제목·설명은 화면 시연을 위해 지어낸 문장이다. 실제 기사·사실·수치·인용이 아니다.
//    그래서 모든 제목 앞에 [시연용] 을 붙이고, 언론사·주소도 가짜임이 드러나게 만든다.
//    실제 데이터(DB)와 섞이지 않도록 isDemo: true, source: "demo" 로 표시한다.
//
// 날짜는 "오늘(KST)"을 기준으로 상대적으로 만든다. 그래야 언제 열어도 시연이 된다.
//   오늘      : 12건  (3 / 12 같은 위치 표시 확인용, 긴 제목·이미지 없음 포함)
//   1일 전    : 1건   (카드 한 장만 보이는지 확인용)
//   2일 전    : 0건   (수집은 했지만 기사 없음 → 빈 상태)
//   3일 전    : 수집 실패 상태 + 이전에 저장된 3건 (실패해도 저장된 기사는 보임)
//   4~13일 전 : 날짜마다 0~5건
//   14일 이전 : 수집 기록 없음(not_collected) — 과거 기사를 채울 수 있다고 가정하지 않는다

import { addDays, compareDate, todayKst } from "./date";
import type { Article, Category, DayResult } from "./types";

/** 시연용 기사 틀. 제목·설명 모두 '샘플'임을 문장 안에서 밝힌다. */
const TEMPLATES: { category: Category; title: string; description: string | null }[] = [
  {
    category: "안전",
    title: "[시연용] 발전소 안전 점검 관련 샘플 기사 제목",
    description: "화면 시연을 위한 샘플 설명입니다. 실제 기사 내용이 아니며, 사실·수치·인용을 담고 있지 않습니다.",
  },
  {
    category: "에너지전환",
    title: "[시연용] 신재생에너지 사업 관련 샘플 기사 제목",
    description: "카드 앞면에 보이는 짧은 설명 자리입니다. 실제 서비스에서는 이용이 허락된 출처의 설명만 표시합니다.",
  },
  {
    category: "경영",
    title:
      "[시연용] 제목이 아주 긴 경우를 확인하기 위한 샘플 기사 제목입니다 — 카드에서는 몇 줄까지만 보이고 나머지는 말줄임표로 줄어들며, 상세 보기에서 전체 제목을 확인할 수 있어야 합니다",
    description: "긴 제목이 카드 높이를 깨뜨리지 않는지 확인하는 샘플입니다.",
  },
  {
    category: "사회공헌",
    title: "[시연용] 지역사회 나눔 활동 관련 샘플 기사 제목",
    description: null, // 설명이 없는 경우를 시연
  },
  {
    category: "지역",
    title: "[시연용] 충남 지역 소식 관련 샘플 기사 제목",
    description: "지역 분류 카드의 색과 아이콘을 확인하는 샘플입니다.",
  },
  {
    category: "기타",
    title: "[시연용] 기타 분류 샘플 기사 제목",
    description: "분류가 정해지지 않은 기사는 '기타'로 표시됩니다.",
  },
];

/** 시연용 언론사 이름. 실제 언론사 이름을 쓰지 않는다. */
const DEMO_PRESS = ["시연일보", "샘플뉴스", "예시경제", "데모타임즈"];

/** 날짜 문자열로 0~(n-1) 사이의 고정된 수를 만든다(새로고침해도 같은 결과). */
function seeded(date: string, n: number): number {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % n;
}

/** KST 시·분을 ISO 문자열로. 예: 2026-10-27T09:30:00+09:00 */
function kstIso(date: string, minutesFromMidnight: number): string {
  const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const mm = String(minutesFromMidnight % 60).padStart(2, "0");
  return `${date}T${hh}:${mm}:00+09:00`;
}

/** 지금이 KST 자정에서 몇 분 지났는지. */
function minutesSinceKstMidnight(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** 오늘의 시연용 '마지막 수집' 시각 = 이번 정시(분). 0시대면 0분. */
function lastCollectMinuteToday(now: Date): number {
  return Math.floor(minutesSinceKstMidnight(now) / 60) * 60;
}

/**
 * 하루치 시연용 기사 count 건을 만든다.
 * 모든 기사는 그날 '마지막으로 성공한 수집'(lastCollectMinute) 전에 발행·수집된 것으로 만든다.
 */
function makeArticles(date: string, count: number, lastCollectMinute: number): Article[] {
  // 발행 20분 뒤에 수집했다고 치므로, 발행은 마지막 수집 20분 전까지만.
  const endMinute = Math.max(lastCollectMinute - 20, 0);
  const startMinute = endMinute >= 9 * 60 ? 6 * 60 : 0;
  const collectCap = lastCollectMinute;

  return Array.from({ length: count }, (_, i) => {
    const t = TEMPLATES[(i + seeded(date, TEMPLATES.length)) % TEMPLATES.length];
    // 최신 기사가 앞(0번)에 오도록 i가 클수록 이른 시각.
    const minute = Math.round(endMinute - ((endMinute - startMinute) * i) / Math.max(count, 1));
    // 4번째 기사마다 '발행시각 없음'을 시연 → 날짜 기준이 '수집일'로 표시된다.
    const noPublishedTime = i % 4 === 3;
    const id = `demo-${date}-${i + 1}`;

    return {
      id,
      title: t.title,
      description: t.description,
      summaryKind: t.description ? "demo" : "none",
      keyPoints: [],
      fullText: null,
      press: DEMO_PRESS[(i + seeded(date, 4)) % DEMO_PRESS.length],
      // example.com 은 문서·시연용으로 예약된 주소라 실제 기사로 오해될 일이 없다.
      url: `https://example.com/demo-news/${date}/${i + 1}`,
      portalUrl: null,
      // 이미지 주소가 있어도 이용 허락(imageAllowed)이 없으면 사진 대신 분류 색·아이콘을 쓴다.
      imageUrl: i % 3 === 0 ? `https://example.com/demo-news/${date}/${i + 1}.jpg` : null,
      imageAllowed: false,
      category: t.category,
      publishedAt: noPublishedTime ? null : kstIso(date, minute),
      firstCollectedAt: kstIso(date, Math.min(minute + 20, collectCap)),
      source: "demo",
      sourceLabel: "시연용 데이터",
      dedupKey: `demo:${id}`,
      kstDate: date,
      dateBasis: noPublishedTime ? "collected" : "published",
      isDemo: true,
    } satisfies Article;
  });
}

/** 시연용 하루치 결과. 실제 DB 조회 함수와 같은 모양(DayResult)을 돌려준다. */
export function getDemoDay(date: string, now: Date = new Date()): DayResult {
  const today = todayKst();
  const base = { date, dataMode: "demo" as const, errorMessage: null };

  // 미래 날짜: 수집할 수 없으니 기록 없음.
  if (compareDate(date, today) > 0) {
    return { ...base, articles: [], status: "not_collected", lastCollectedAt: null };
  }

  // 그날 마지막으로 성공한 수집 시각(시연용, 자정부터 분): 오늘이면 이번 정시, 지난 날이면 23:00.
  const lastMinute = date === today ? lastCollectMinuteToday(now) : 23 * 60;

  let count: number;
  if (date === today) count = 12;
  else if (date === addDays(today, -1)) count = 1;
  else if (date === addDays(today, -2)) count = 0;
  else if (date === addDays(today, -3)) {
    // 18시 수집까지는 성공했고, 그 뒤 수집이 실패한 상황.
    return {
      ...base,
      articles: makeArticles(date, 3, 18 * 60),
      status: "failed",
      lastCollectedAt: kstIso(date, 18 * 60),
      errorMessage: "시연용: 마지막 수집이 실패한 상태를 보여 주는 예시입니다. 이전에 저장된 기사는 그대로 보입니다.",
    };
  } else if (compareDate(date, addDays(today, -13)) >= 0) count = seeded(date, 6);
  else return { ...base, articles: [], status: "not_collected", lastCollectedAt: null };

  return {
    ...base,
    articles: makeArticles(date, count, lastMinute),
    status: count > 0 ? "ok" : "empty",
    lastCollectedAt: kstIso(date, lastMinute),
  };
}
