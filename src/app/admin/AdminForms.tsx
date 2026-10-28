"use client";

// 관리자 화면의 입력 부분(로그인 · 지금 수집 · 로그아웃). 실제 처리와 권한 확인은 서버 액션이 한다.

import { useActionState } from "react";
import { collectNow, login, logout, type ActionState } from "./actions";

const initial: ActionState = { ok: false, message: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="admin-password" className="text-sm font-semibold">
        관리자 비밀번호
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-navy px-5 py-3 font-semibold text-white transition hover:bg-navy/90 disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-rose-700">
        {state.message}
      </p>
    </form>
  );
}

export function CollectButton() {
  const [state, action, pending] = useActionState(collectNow, initial);
  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "수집 중… (최대 1분 정도)" : "지금 수집"}
      </button>
      <p aria-live="polite" className={`min-h-5 text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
        {state.message}
      </p>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="rounded-full px-3 py-1.5 text-sm font-semibold text-navy-soft ring-1 ring-slate-300 transition hover:bg-white">
        로그아웃
      </button>
    </form>
  );
}
