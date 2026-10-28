"use client";

// 기사 카드 한 장의 "모양"만 담당한다(겹치기·이동은 CardStack 이 한다).
// 앞면 구성: 분류 태그 · 제목(강조) · 짧은 설명 · 언론사와 시간 · 상세 아이콘
// 사진은 이용 허락(imageAllowed)이 있을 때만. 없으면 분류 색과 아이콘을 쓴다.

import type { Ref } from "react";
import { CATEGORY_STYLES } from "@/lib/news/category";
import { formatKstTime } from "@/lib/news/date";
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
      {/* 위쪽 그림 자리: 허락된 사진, 아니면 분류 색 + 아이콘 */}
      <div className={`relative h-24 shrink-0 bg-gradient-to-br sm:h-28 ${style.panel}`}>
        {showPhoto ? (
          // 허락된 외부 이미지만 들어오므로 next/image 대신 일반 img 를 쓴다(도메인 설정 불필요).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imageUrl!} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <CategoryIcon article={article} className="absolute right-5 top-1/2 size-14 -translate-y-1/2 opacity-80 sm:size-16" />
        )}
        <div className="absolute left-5 top-4 flex items-center gap-2">
          <CategoryTag article={article} />
          {article.isDemo && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-navy-soft ring-1 ring-slate-300">
              시연용
            </span>
          )}
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col px-5 pb-4 pt-4 sm:px-6 ${contentFade}`}>
        {/* 긴 제목은 3줄까지만 보이고 나머지는 … 처리. 전체 제목은 상세 보기에서. */}
        <h3 className="line-clamp-3 text-lg font-bold leading-snug sm:text-xl" title={article.title}>
          {article.title}
        </h3>
        {article.description ? (
          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-navy-soft">{article.description}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">제공된 설명이 없습니다.</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
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
