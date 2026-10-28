"use client";

// 화면 맨 위 날짜 탐색.
//  [‹ 이전 날짜]   2026년 10월 27일 ▾   [다음 날짜 ›]
//                     화요일
//                    [ 오늘 ]
// - 날짜를 누르면 달력이 열린다. 미래 날짜는 고를 수 없다.
// - 오늘이면 '다음 날짜'와 '오늘' 버튼이 비활성화된다(미래로 못 간다).
// - 날짜 계산은 모두 KST 기준(lib/news/date.ts).

import { useEffect, useRef, useState } from "react";
import { addDays, compareDate, formatKoreanDate, monthInfo, toDateString } from "@/lib/news/date";

interface DateNavProps {
  date: string;
  today: string;
  onChange: (date: string) => void;
}

/** 동그란 화살표 버튼. 기사 이동 버튼(알약 모양 글자 버튼)과 생김새를 확실히 다르게 한다. */
function ArrowButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "이전 날짜" : "다음 날짜"}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-white shadow-card transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function DateNav({ date, today, onChange }: DateNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { dateText, weekday } = formatKoreanDate(date);
  const isToday = date === today;

  return (
    <nav aria-label="날짜 이동" className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-2 sm:justify-center sm:gap-8">
        <ArrowButton dir="prev" disabled={false} onClick={() => onChange(addDays(date, -1))} />

        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${dateText} ${weekday}, 달력 열기`}
            className="group flex flex-col items-center rounded-2xl px-3 py-1 transition hover:bg-white/70"
          >
            <span className="flex items-center gap-1.5 text-2xl font-bold tracking-tight sm:text-4xl">
              {dateText}
              <svg viewBox="0 0 24 24" className="size-5 text-navy-soft transition group-hover:text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="mt-0.5 text-base font-medium text-navy-soft sm:text-lg">{weekday}</span>
          </button>

          {open && (
            <Calendar
              selected={date}
              today={today}
              onSelect={(d) => {
                setOpen(false);
                triggerRef.current?.focus();
                if (d !== date) onChange(d);
              }}
              onClose={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            />
          )}
        </div>

        <ArrowButton dir="next" disabled={isToday} onClick={() => onChange(addDays(date, 1))} />
      </div>

      <button
        type="button"
        onClick={() => onChange(today)}
        disabled={isToday}
        className="rounded-full border border-accent/30 bg-white px-4 py-1.5 text-sm font-semibold text-accent shadow-sm transition hover:bg-accent-soft disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-navy-soft disabled:shadow-none"
      >
        {isToday ? "오늘 뉴스 보는 중" : "오늘"}
      </button>
    </nav>
  );
}

// ───────────────────────── 달력 ─────────────────────────

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarProps {
  selected: string;
  today: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

/**
 * 한 달 달력 팝업.
 * 키보드: ←→ 하루, ↑↓ 일주일 이동, Enter 선택, Esc 닫기. 미래 날짜로는 이동되지 않는다.
 */
function Calendar({ selected, today, onSelect, onClose }: CalendarProps) {
  // 지금 키보드 초점이 있는 날짜. 이 날짜가 속한 달을 보여 준다.
  const [focusDate, setFocusDate] = useState(selected);
  const [year, month] = focusDate.split("-").map(Number);
  const { firstWeekday, days } = monthInfo(year, month);
  const boxRef = useRef<HTMLDivElement>(null);
  const [, todayMonth] = today.split("-").map(Number);
  const isCurrentMonth = year === Number(today.slice(0, 4)) && month === todayMonth;

  // 달력이 열리거나 초점 날짜가 바뀌면 그 날짜 버튼에 실제 초점을 준다.
  useEffect(() => {
    boxRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)?.focus();
  }, [focusDate]);

  // 달력 바깥을 누르면 닫는다.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  /** 초점을 n일 옮긴다. 미래로는 가지 않는다. */
  function move(n: number) {
    const next = addDays(focusDate, n);
    setFocusDate(compareDate(next, today) > 0 ? today : next);
  }

  /** 달 이동. 같은 '일'을 유지하되 그 달에 없는 날(31일 등)이면 말일로. */
  function moveMonth(n: number) {
    const target = new Date(Date.UTC(year, month - 1 + n, 1));
    const y = target.getUTCFullYear();
    const m = target.getUTCMonth() + 1;
    const d = Math.min(Number(focusDate.slice(8)), monthInfo(y, m).days);
    const next = toDateString(y, m, d);
    setFocusDate(compareDate(next, today) > 0 ? today : next);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => move(-7),
      ArrowDown: () => move(7),
      PageUp: () => moveMonth(-1),
      PageDown: () => moveMonth(1),
      Escape: onClose,
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  }

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="날짜 선택 달력"
      onKeyDown={onKeyDown}
      className="absolute left-1/2 top-full z-[60] mt-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-slate-200"
    >
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달" className="grid size-9 place-items-center rounded-full text-navy hover:bg-slate-100">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <p className="font-bold" aria-live="polite">{year}년 {month}월</p>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          disabled={isCurrentMonth}
          aria-label="다음 달"
          className="grid size-9 place-items-center rounded-full text-navy hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-navy-soft" aria-hidden="true">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : ""}>{w}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {/* 1일 앞의 빈 칸 */}
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = toDateString(year, month, i + 1);
          const isFuture = compareDate(d, today) > 0;
          const isSelected = d === selected;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              data-date={d}
              disabled={isFuture}
              // 초점 날짜 하나만 Tab 으로 들어올 수 있게(나머지는 화살표로 이동)
              tabIndex={d === focusDate ? 0 : -1}
              onClick={() => onSelect(d)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              aria-label={`${month}월 ${i + 1}일${isToday ? " 오늘" : ""}${isFuture ? " (선택 불가)" : ""}`}
              className={[
                "aspect-square rounded-full text-sm transition",
                isSelected
                  ? "bg-accent font-bold text-white"
                  : isToday
                    ? "font-bold text-accent ring-2 ring-accent/40 hover:bg-accent-soft"
                    : "hover:bg-slate-100",
                "disabled:cursor-not-allowed disabled:text-slate-300 disabled:ring-0 disabled:hover:bg-transparent",
              ].join(" ")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
