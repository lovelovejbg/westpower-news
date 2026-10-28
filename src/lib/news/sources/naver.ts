// 네이버 검색 API(뉴스) 출처 모듈 — NAVER API HUB(네이버 클라우드 플랫폼) 경유.
// 2026-07-31 부터 네이버 개발자센터의 검색 API 신규 신청이 막혀 NAVER API HUB 로 옮겨졌다.
//   공지: https://developers.naver.com/notice/article/32530
//   문서: https://api.ncloud-docs.com/docs/naver-api-hub-search-news (요청 조건 · 응답 모양은 개발자센터와 같음)
// 약관: https://developers.naver.com/products/terms/ ('네이버 검색 API 서비스' 2.1~2.4)
//
// 지키는 것
// - 결과를 가공하지 않는다: 제목·발췌문에서 강조 태그(<b>)와 HTML 기호(&quot; 등)만 글자로 되돌린다.
// - 제목에 '서부발전' / 'KOWEPO' / 발전본부 이름이 없는 결과는 저장하지 않는다(내용·순서는 그대로, 걸러 내기만).
// - 분류를 추측해 붙이지 않는다(모두 '기타'). 언론사 이름도 추측하지 않고 원문 주소의 도메인을 그대로 쓴다.
// - 발췌문은 요약이 아니므로 summaryKind 'snippet'.
// - AI 에 넣지 않는다.

import "server-only";
import { RetryableError, type CollectedItem, type FetchOptions, type SourceModule } from "./types";

const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/news";
const QUERY = "한국서부발전";
const PAGE_SIZE = 100; // API 최댓값
const MAX_PAGES = 3; // 한 번 수집에 최대 300건(호출 3회)

interface NaverItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverResponse {
  items?: NaverItem[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** "<b>한국서부발전</b> &quot;안전&quot;" → "한국서부발전 "안전"" */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|ref|from)$/i;

/**
 * 같은 기사 판별용 주소 정규화.
 * 프로토콜(http/https)·대소문자(호스트)·추적용 파라미터·#뒤·끝의 / 차이만 없앤다. 경로와 나머지 파라미터는 그대로.
 */
export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  }
  const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : "";
  const search = u.searchParams.toString();
  return `${u.hostname.toLowerCase()}${path}${search ? `?${search}` : ""}`;
}

/** 원문 주소의 도메인(www. 제외)을 언론사 칸에 쓴다. */
function pressFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "알 수 없음";
  }
}

function toItem(raw: NaverItem): CollectedItem | null {
  const original = raw.originallink?.trim() || raw.link?.trim();
  if (!original) return null;
  const key = normalizeUrl(original);
  if (!key) return null;

  const title = toPlainText(raw.title ?? "");
  if (!title) return null;
  const description = toPlainText(raw.description ?? "") || null;

  const published = new Date(raw.pubDate);
  const portal = raw.link?.trim();

  return {
    dedupKey: `naver:${key}`,
    title,
    description,
    summaryKind: description ? "snippet" : "none",
    press: pressFromUrl(original),
    url: original,
    portalUrl: portal && portal !== original && /^https?:\/\//.test(portal) ? portal : null,
    category: "기타",
    publishedAt: Number.isNaN(published.getTime()) ? null : published.toISOString(),
  };
}

async function fetchPage(query: string, start: number, clientId: string, clientSecret: string): Promise<NaverItem[]> {
  const url = `${ENDPOINT}?${new URLSearchParams({
    query,
    display: String(PAGE_SIZE),
    start: String(start),
    sort: "date",
    format: "json",
  })}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-NCP-APIGW-API-KEY-ID": clientId, "X-NCP-APIGW-API-KEY": clientSecret },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new RetryableError(`네이버 API 연결 실패: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!res.ok) {
    // 응답 본문에는 키가 들어 있지 않다. 원인 파악을 위해 앞부분만 남긴다.
    const body = (await res.text().catch(() => "")).slice(0, 300);
    const message = `네이버 API 오류 ${res.status}: ${body}`;
    // 429(호출 한도)·5xx 는 잠시 뒤 다시 시도할 만하다. 401(키 오류 · 앱에 뉴스 검색 API 권한 없음) 등은 다시 해도 같다.
    if (res.status === 429 || res.status >= 500) throw new RetryableError(message);
    throw new Error(message);
  }

  const data = (await res.json()) as NaverResponse;
  return data.items ?? [];
}

export const naverSource: SourceModule = {
  id: "naver",
  requiredEnv: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],

  async fetchItems({ notBefore }: FetchOptions) {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.");

    // 따옴표로 묶어 '한국 / 서부 / 발전' 으로 쪼개 찾지 않게 한다. 결과가 하나도 없으면 따옴표 없이 다시 찾는다.
    let query = `"${QUERY}"`;
    let firstPage = await fetchPage(query, 1, clientId, clientSecret);
    if (firstPage.length === 0) {
      query = QUERY;
      firstPage = await fetchPage(query, 1, clientId, clientSecret);
    }

    const items: CollectedItem[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const raw = page === 0 ? firstPage : await fetchPage(query, page * PAGE_SIZE + 1, clientId, clientSecret);

      let reachedOld = false;
      for (const r of raw) {
        const item = toItem(r);
        if (!item) continue;
        // 보관 기한보다 오래된 기사는 저장하지 않는다. 최신순이므로 하나라도 나오면 다음 쪽은 볼 필요가 없다.
        if (item.publishedAt && new Date(item.publishedAt) < notBefore) {
          reachedOld = true;
          continue;
        }
        items.push(item);
      }

      if (reachedOld || raw.length < PAGE_SIZE) break;
    }
    return items;
  },

  isRelevant: isAboutWestPower,
};

/**
 * 제목에 서부발전(또는 그 발전본부)을 가리키는 말이 있는지(띄어쓰기 무시).
 * 발췌문에만 지나가듯 나오는 기사(다른 기관 시상 명단, 다른 발전사 기사 등)는 주제가 아니므로 뺀다.
 */
const RELEVANT_TITLE = /서부발전|kowepo|태안발전본부|평택발전본부|서인천발전본부|군산발전본부/i;

export function isAboutWestPower(item: Pick<CollectedItem, "title">): boolean {
  return RELEVANT_TITLE.test(item.title.replace(/\s+/g, ""));
}
