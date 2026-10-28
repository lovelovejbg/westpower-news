"use client";

// 기사 상세 보기.
// - PC: 화면 가운데 모달 / 휴대폰: 아래에서 올라온 거의 전체 화면 패널
// - 브라우저 기본 <dialog> 를 써서 ESC 닫기·바깥 내용 비활성화를 기본으로 얻는다.
// - 닫으면 부모(ArticleViewer)가 보던 카드의 상세 버튼으로 초점을 되돌린다.
// - 지어낸 내용을 넣지 않는다: 요약 칸의 글이 '발췌'인지 '요약'인지 '시연용'인지 꼭 밝히고,
//   핵심 내용·전문은 출처가 허락해서 값이 있을 때만 보여 준다.

import { useEffect, useRef } from "react";
import { formatKstDateTime } from "@/lib/news/date";
import { SUMMARY_LABEL } from "@/lib/news/summary";
import type { Article } from "@/lib/news/types";
import { CategoryIcon, SourceOrCategoryTag } from "./NewsCard";

interface DetailModalProps {
  article: Article | null;
  onClose: () => void;
}

export default function DetailModal({ article, onClose }: DetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // article 이 생기면 모달을 열고, 없어지면 닫는다.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (article && !dialog.open) {
      dialog.showModal();
      // 모달이 열린 동안 뒤 페이지가 스크롤되지 않게.
      document.documentElement.style.overflow = "hidden";
    } else if (!article && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [article]);

  const summary = article ? SUMMARY_LABEL[article.summaryKind] : null;

  return (
    <dialog
      ref={dialogRef}
      // ESC 나 dialog.close() 로 닫히면 'close' 이벤트가 온다 → 부모 상태도 닫힘으로.
      onClose={onClose}
      // 브라우저 기본 ESC 처리가 동작하지 않는 환경(일부 보조기기·자동화 도구)을 위해 직접도 처리한다.
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.close();
        }
      }}
      // 어두운 바깥(backdrop)을 누르면 닫는다. 내용 안쪽 클릭은 target 이 dialog 가 아니다.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      aria-labelledby="detail-title"
      className={[
        // 휴대폰: 화면 아래에 붙은 거의 전체 높이 패널
        "m-0 mt-auto h-[94dvh] max-h-none w-full max-w-none rounded-t-3xl bg-white p-0 text-navy shadow-pop",
        // PC(sm 이상): 가운데 모달
        "sm:m-auto sm:h-auto sm:max-h-[85vh] sm:w-[min(42rem,calc(100vw-3rem))] sm:rounded-3xl",
      ].join(" ")}
    >
      {article && summary && (
        <div className="flex h-full max-h-[inherit] flex-col">
          {/* 머리: 분류·닫기 (스크롤해도 고정) */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 sm:px-7">
            <div className="flex items-center gap-2">
              <CategoryIcon article={article} className="size-6" />
              <SourceOrCategoryTag article={article} />
              {article.isDemo && <span className="text-xs font-semibold text-navy-soft">시연용 데이터</span>}
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              aria-label="상세 보기 닫기"
              className="grid size-10 place-items-center rounded-full text-navy-soft transition hover:bg-slate-100 hover:text-navy"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* 본문(길면 이 부분만 스크롤) */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <h2 id="detail-title" className="text-xl font-bold leading-snug sm:text-2xl">
              {article.title}
            </h2>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {/* 네이버 결과는 언론사 이름을 주지 않아, 추측하지 않고 원문 사이트 주소를 보여 준다. */}
              <dt className="text-navy-soft">{article.source === "naver" ? "원문 사이트" : "언론사"}</dt>
              <dd className="font-semibold">{article.press}</dd>
              <dt className="text-navy-soft">발행 시각</dt>
              <dd>
                {article.publishedAt ? (
                  <time dateTime={article.publishedAt}>{formatKstDateTime(article.publishedAt)}</time>
                ) : (
                  <span>
                    정보 없음 <span className="text-navy-soft">(수집일 기준으로 날짜를 분류했어요)</span>
                  </span>
                )}
              </dd>
              <dt className="text-navy-soft">처음 수집</dt>
              <dd>
                <time dateTime={article.firstCollectedAt}>{formatKstDateTime(article.firstCollectedAt)}</time>
              </dd>
              <dt className="text-navy-soft">출처</dt>
              <dd>{article.sourceLabel}</dd>
            </dl>

            <section className="mt-6">
              <h3 className="text-sm font-bold text-accent">{summary.title}</h3>
              {article.description ? (
                <p className="mt-1.5 leading-relaxed">{article.description}</p>
              ) : (
                <p className="mt-1.5 text-navy-soft">이 출처는 요약·설명을 제공하지 않아요. 원문에서 내용을 확인해 주세요.</p>
              )}
              {summary.note && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-navy-soft">{summary.note}</p>}
            </section>

            {article.keyPoints.length > 0 && (
              <section className="mt-6">
                <h3 className="text-sm font-bold text-accent">핵심 내용</h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 leading-relaxed">
                  {article.keyPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            )}

            {article.fullText ? (
              <section className="mt-6">
                <h3 className="text-sm font-bold text-accent">본문</h3>
                <div className="mt-1.5 whitespace-pre-line leading-relaxed">{article.fullText}</div>
              </section>
            ) : (
              <p className="mt-6 text-xs text-slate-500">
                기사 전문은 이용 허락을 받은 출처만 보여 드려요. 전체 내용은 원문에서 확인해 주세요.
              </p>
            )}
          </div>

          {/* 아래: 원문 링크 (항상 보이게 고정) */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:px-7">
            {article.portalUrl && (
              <a
                href={article.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-navy ring-1 ring-slate-300 transition hover:bg-slate-50 sm:shrink-0"
              >
                네이버 뉴스에서 보기
                <span className="sr-only">(새 창에서 열림)</span>
              </a>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent sm:flex-1 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              원문 기사 보기{article.isDemo && " (시연용 주소)"}
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
              </svg>
              <span className="sr-only">(새 창에서 열림)</span>
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
