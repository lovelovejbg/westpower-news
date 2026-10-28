"use client";

// 기사 카드 한 장의 "모양"만 담당한다(겹치기·이동은 CardStack 이 한다).
// 앞면 구성: 위 = 분류 태그 · 제목(강조) / 아래 = 요약(종류 표시) · 언론사와 시간 · 상세 아이콘
// 사진은 이용 허락(imageAllowed)이 있을 때만. 없으면 분류 색과 아이콘을 쓴다.

import type { Ref } from "react";
import { CATEGORY_STYLES } from "@/lib/news/category";
import { formatKstTime } from "@/lib/news/date";
import { SUMMARY_LABEL } from "@/lib/news/summary";
import type { Article } from "@/lib/news/types";

/** 분류 아이콘(SVG). 상세 보기에서도 쓴다. */
export function CategoryIcon({ article, className }: { article: Article; className?: string }) {
  const style = CATEGORY_STYLES[article.category];
  return (
    <svg viewBox="0 0 24 24" className={`${style.icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={style.iconPath} />
    </svg>
  );
}

/** 분류 태그(알약 모양). */
export function CategoryTag({ article }: { article: Article }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CATEGORY_STYLES[article.category].tag}`}>
      {article.category}
    </span>
  );
}

/** 카드·상세에 쓰는 시간 글자. 발행시각이 없으면 '수집 ○시'라고 기준을 밝힌다. */
export function articleTimeLabel(article: Article): string {
  return article.publishedAt
    ? formatKstTime(article.publishedAt)
    : `수집 ${formatKstTime(article.firstCollectedAt)}`;
}

interface NewsCardProps {
  article: Article;
  /** 앞 카드일 때만 상세 버튼을 키보드로 누를 수 있게 한다. 뒤 카드는 글자를 감춰 가장자리만 깔끔하게 보이게 한다. */
  interactive: boolean;
  onOpenDetail?: () => void;
  detailButtonRef?: Ref<HTMLButtonElement>;
}

export default function NewsCard({ article, interactive, onOpenDetail, detailButtonRef }: NewsCardProps) {
  const style = CATEGORY_STYLES[article.category];
  const showPhoto = article.imageAllowed && article.imageUrl;
  // 뒤 카드 → 앞 카드로 올라올 때 글자가 부드럽게 나타나도록 투명도에 애니메이션을 건다.
  const contentFade = `transition-opacity duration-250 ${interactive ? "opacity-100" : "opacity-0"}`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200/70">
      {/* ── 위: 분류 태그 + 제목 ──
          배경은 허락된 사진(어둡게 덮어 흰 글자), 아니면 분류 색 + 아이콘. */}
      <div className={`relative flex h-48 shrink-0 flex-col gap-3 bg-gradient-to-br px-5 pb-4 pt-4 sm:px-6 ${style.panel}`}>
        {showPhoto ? (
          <>
            {/* 허락된 외부 이미지만 들어오므로 next/image 대신 일반 img 를 쓴다(도메인 설정 불필요). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.imageUrl!} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
            {/* 사진 위에서도 제목이 읽히도록 아래쪽을 어둡게 */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/40 to-transparent" aria-hidden="true" />
          </>
        ) : null}

        {/* 태그와 아이콘을 한 줄에 둬서, 제목이 길어져도 아이콘을 가리지 않게 한다. */}
        <div className="relative flex items-center gap-2">
          <CategoryTag article={article} />
          {article.isDemo && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-navy-soft ring-1 ring-slate-300">
              시연용
            </span>
          )}
          {!showPhoto && <CategoryIcon article={article} className="ml-auto size-9 opacity-70" />}
        </div>

        {/* 긴 제목은 3줄까지만 보이고 나머지는 … 처리. 전체 제목은 상세 보기에서. */}
        <h3
          className={`relative mt-auto line-clamp-3 text-xl font-bold leading-snug sm:text-[22px] ${showPhoto ? "text-white" : "text-navy"} ${contentFade}`}
          title={article.title}
        >
          {article.title}
        </h3>
      </div>

      {/* ── 아래: 요약(또는 발췌·시연용 설명) + 언론사·시간 ── */}
      <div className={`flex min-h-0 flex-1 flex-col px-5 pb-4 pt-4 sm:px-6 ${contentFade}`}>
        {article.description ? (
          <>
            {/* 글의 종류를 꼭 밝힌다: 검색 발췌를 '요약'이라고 부르지 않는다. */}
            <p className="text-xs font-bold text-accent">{SUMMARY_LABEL[article.summaryKind].title}</p>
            <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-navy-soft">{article.description}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">제공된 요약이 없습니다. 상세 보기나 원문에서 확인해 주세요.</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="min-w-0 truncate text-sm text-navy-soft">
            <span className="font-semibold text-navy">{article.press}</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={article.publishedAt ?? article.firstCollectedAt}>{articleTimeLabel(article)}</time>
          </p>
          <button
            ref={detailButtonRef}
            type="button"
            tabIndex={interactive ? 0 : -1}
            onClick={(e) => {
              // 카드 전체 클릭 처리와 겹쳐 두 번 열리지 않게 막는다.
              e.stopPropagation();
              onOpenDetail?.();
            }}
            aria-label={`상세 보기: ${article.title}`}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition hover:bg-accent hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
