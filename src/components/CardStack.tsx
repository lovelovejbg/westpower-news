"use client";

// 겹친 카드 묶음.
// - 앞 카드(현재 기사)는 온전히 보이고, 뒤 카드 최대 3장은 오른쪽으로 조금씩 밀리고 작아져 가장자리만 보인다.
// - 다음 기사로 넘기면 앞 카드가 왼쪽으로 밀려 나가고, 오른쪽 뒤 카드가 앞으로 나온다(이전은 반대 방향).
// - 뒤 카드를 누르면 그 기사가 앞으로 온다. 앞 카드를 누르면 상세 보기가 열린다.
// - '이전 기사' / '다음 기사' 버튼과 '3 / 12' 위치 표시. (날짜 화살표와 모양을 다르게 했다)
// - 휴대폰에서는 좌우로 밀어서(스와이프) 넘긴다. 키보드는 ← → 로 넘긴다.
// - 애니메이션은 250ms. '움직임 줄이기' 설정이면 globals.css 에서 꺼진다.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Article } from "@/lib/news/types";
import NewsCard from "./NewsCard";

/** 뒤에 보여 줄 카드 수 */
const BACK_CARDS = 3;
/**
 * 뒤 카드 한 장마다 오른쪽으로 삐져나오는 거리는 CSS 변수 --peek (휴대폰 14px, PC 22px)로 정한다.
 * 줄어드는 비율은 SCALE_STEP.
 */
const SCALE_STEP = 0.06;
/** 스와이프로 인정할 최소 가로 이동(px) */
const SWIPE_MIN = 60;

interface CardStackProps {
  articles: Article[];
  index: number;
  onIndexChange: (index: number) => void;
  onOpenDetail: () => void;
  /** 상세 보기를 닫은 뒤 초점을 돌려줄 앞 카드의 상세 버튼 */
  detailButtonRef: RefObject<HTMLButtonElement | null>;
}

/** 카드가 앞 카드로부터 몇 번째 뒤에 있는지(pos)에 따라 위치·크기·투명도를 정한다. */
function cardStyle(pos: number, dragX: number): React.CSSProperties {
  if (pos < 0) {
    // 이미 지나간 카드: 왼쪽 화면 밖으로 밀려 나가며 사라진다.
    return { transform: "translateX(-110%) rotate(-4deg)", opacity: 0, zIndex: 41 };
  }
  if (pos === 0) {
    // 앞 카드: 손가락으로 끄는 중이면 그만큼 따라 움직인다.
    return {
      transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)`,
      opacity: 1,
      zIndex: 40,
      // 끄는 중에는 손가락을 바로 따라가도록 애니메이션을 끈다.
      transitionDuration: dragX ? "0ms" : undefined,
    };
  }
  const p = Math.min(pos, BACK_CARDS);
  return {
    // 오른쪽 끝을 기준(origin-right)으로 줄인 뒤 오른쪽으로 밀어, 오른쪽 가장자리가 계단처럼 보이게 한다.
    transform: `translateX(calc(var(--peek) * ${p})) scale(${1 - p * SCALE_STEP})`,
    // 너무 뒤에 있는 카드는 마지막 자리에 겹쳐 숨긴다(다음으로 나올 때 자연스럽게 등장).
    opacity: pos > BACK_CARDS ? 0 : 1 - p * 0.12,
    zIndex: 40 - p,
  };
}

export default function CardStack({ articles, index, onIndexChange, onOpenDetail, detailButtonRef }: CardStackProps) {
  const total = articles.length;
  const [dragX, setDragX] = useState(0);
  // 스와이프 시작점. 마우스는 글자 선택을 위해 스와이프에서 뺀다(터치·펜만).
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  // 스와이프 직후의 click 이벤트가 상세 보기를 열지 않도록 막는 표시.
  const suppressClick = useRef(false);
  // 키보드로 넘겼는지. 넘기면 초점을 갖고 있던 카드가 뒤로 빠지면서(inert) 초점이 사라지므로,
  // 새 앞 카드의 상세 버튼으로 초점을 옮겨 ← → 를 계속 누를 수 있게 한다.
  const focusFrontAfterMove = useRef(false);

  useEffect(() => {
    if (focusFrontAfterMove.current) {
      focusFrontAfterMove.current = false;
      detailButtonRef.current?.focus();
    }
  }, [index, detailButtonRef]);

  const go = (next: number) => onIndexChange(Math.max(0, Math.min(total - 1, next)));
  const hasPrev = index > 0;
  const hasNext = index < total - 1;
  const visibleBack = Math.min(BACK_CARDS, total - 1 - index);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // 처음 움직인 방향으로 가로/세로를 정한다. 세로면 페이지 스크롤에 양보.
    if (d.horizontal === null && Math.abs(dx) + Math.abs(dy) > 8) d.horizontal = Math.abs(dx) > Math.abs(dy);
    if (d.horizontal) {
      // 더 넘길 카드가 없는 쪽으로는 살짝만 밀리게(고무줄 느낌).
      const blocked = (dx > 0 && !hasPrev) || (dx < 0 && !hasNext);
      setDragX(blocked ? dx / 4 : dx);
    }
  }

  function onPointerEnd(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.horizontal) {
      suppressClick.current = true;
      const dx = e.clientX - d.x;
      if (dx <= -SWIPE_MIN && hasNext) go(index + 1);
      else if (dx >= SWIPE_MIN && hasPrev) go(index - 1);
    }
    setDragX(0);
  }

  function onFrontClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // 글자를 드래그해서 선택한 경우에는 상세를 열지 않는다(복사할 수 있게).
    if (window.getSelection()?.toString()) return;
    onOpenDetail();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // 카드 안(상세 버튼)에 초점이 있을 때만 초점을 따라 옮긴다. 이전/다음 버튼에서 누르면 그 버튼에 그대로 둔다.
    const fromCard = (e.target as HTMLElement).closest('[aria-roledescription="기사"]') !== null;
    if (e.key === "ArrowLeft" && hasPrev) {
      e.preventDefault();
      focusFrontAfterMove.current = fromCard;
      go(index - 1);
    } else if (e.key === "ArrowRight" && hasNext) {
      e.preventDefault();
      focusFrontAfterMove.current = fromCard;
      go(index + 1);
    }
  }

  return (
    <section aria-label="기사 카드" aria-roledescription="카드 묶음" onKeyDown={onKeyDown} className="w-full [--card-h:25rem] [--peek:14px] sm:[--card-h:24rem] sm:[--peek:22px]">
      {/* 지나간 카드가 밖으로 나갈 때 가로 스크롤이 생기지 않게 잘라 내되, 카드 그림자가 잘리지 않도록
          페이지 여백만큼 바깥으로 넓힌 상자(-mx/px)에서 자른다. */}
      <div className="-mx-4 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
      {/* 카드 폭은 뒤 카드 3장이 오른쪽으로 삐져나올 자리(--peek × 3)를 빼고 잡는다. */}
      <div className="relative mx-auto h-(--card-h) w-full">
        {articles.map((article, i) => {
          const pos = i - index;
          // 화면에 영향이 없는 먼 카드는 그리지 않는다(기사가 많아도 가볍게).
          if (pos < -1 || pos > BACK_CARDS + 1) return null;
          const isFront = pos === 0;

          return (
            <div
              key={article.id}
              className="absolute left-0 top-0 h-(--card-h) w-[calc(100%-var(--peek)*3)] origin-right transition-[transform,opacity] duration-250 ease-out will-change-transform"
              style={cardStyle(pos, isFront ? dragX : 0)}
              // 숨은 카드·뒤 카드는 초점·스크린리더 대상에서 뺀다(앞 카드만 읽힌다).
              aria-hidden={!isFront}
              inert={!isFront}
            >
              {isFront ? (
                <div
                  role="group"
                  aria-roledescription="기사"
                  aria-label={`${total}개 중 ${index + 1}번째 기사`}
                  onClick={onFrontClick}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerEnd}
                  onPointerCancel={onPointerEnd}
                  // 세로 스크롤은 브라우저에 맡기고, 가로 움직임만 우리가 받는다.
                  className="h-full cursor-pointer touch-pan-y select-text"
                >
                  <NewsCard article={article} interactive onOpenDetail={onOpenDetail} detailButtonRef={detailButtonRef} />
                </div>
              ) : (
                <NewsCard article={article} interactive={false} />
              )}
            </div>
          );
        })}

        {/* 뒤 카드 클릭 영역. inert 된 카드 위에 투명 버튼을 따로 올려, 보이는 가장자리를 누르면 앞으로 가져온다. */}
        {Array.from({ length: visibleBack }, (_, k) => {
          const p = k + 1;
          const target = articles[index + p];
          return (
            <button
              key={target.id}
              type="button"
              tabIndex={-1}
              onClick={() => go(index + p)}
              aria-label={`${index + p + 1}번째 기사 앞으로 가져오기: ${target.title}`}
              className="absolute inset-y-8 w-(--peek) rounded-r-3xl"
              style={{ left: `calc(100% - var(--peek) * ${BACK_CARDS - p + 1})`, zIndex: 40 - p }}
            />
          );
        })}
      </div>
      </div>

      {/* 기사 이동 버튼: 글자가 있는 알약 모양 + 위치 표시 → 날짜 화살표(동그란 남색)와 구분 */}
      <div className="mt-6 flex items-center justify-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={!hasPrev}
          className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-navy"
        >
          <span aria-hidden="true">‹</span> 이전 기사
        </button>
        <p className="min-w-16 text-center text-sm font-semibold tabular-nums text-navy-soft" aria-live="polite">
          <span aria-hidden="true">
            <span className="text-lg text-navy">{index + 1}</span> / {total}
          </span>
          <span className="sr-only">{total}개 중 {index + 1}번째 기사</span>
        </p>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={!hasNext}
          className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-navy"
        >
          다음 기사 <span aria-hidden="true">›</span>
        </button>
      </div>
      {total > 1 && (
        <p className="mt-2 hidden text-center text-xs text-slate-400 sm:block">키보드 ← → 로도 넘길 수 있어요</p>
      )}
      {total > 1 && <p className="mt-2 text-center text-xs text-slate-400 sm:hidden">카드를 좌우로 밀어서 넘길 수 있어요</p>}
    </section>
  );
}
