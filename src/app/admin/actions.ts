"use server";

// 관리자 서버 액션. 모든 액션이 서버에서 직접 권한을 다시 확인한다.

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { checkPassword, createSessionToken, isAdmin, SESSION_COOKIE, SESSION_HOURS } from "@/lib/admin/auth";
import { runCollection } from "@/lib/news/collect";
import { DEFAULT_SOURCE_ID } from "@/lib/news/sources";

export interface ActionState {
  ok: boolean;
  message: string;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // 무작위 대입을 느리게 만든다.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    return { ok: false, message: "비밀번호가 맞지 않아요." };
  }
  const token = createSessionToken();
  if (!token) return { ok: false, message: "서버 설정(ADMIN_SESSION_SECRET)이 없어 로그인할 수 없어요." };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3_600,
  });
  refresh();
  return { ok: true, message: "" };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  refresh();
}

export async function collectNow(): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, message: "로그인이 필요해요. 새로고침 후 다시 로그인해 주세요." };

  const outcome = await runCollection(DEFAULT_SOURCE_ID);
  refresh();
  switch (outcome.status) {
    case "success":
      return { ok: true, message: `수집 완료: 받은 기사 ${outcome.fetched}건 중 새 기사 ${outcome.newCount}건을 저장했어요.` };
    case "busy":
      return { ok: false, message: "이미 수집이 진행 중이에요. 잠시 뒤 다시 확인해 주세요." };
    case "not_configured":
      return { ok: false, message: `서버 환경변수가 빠져 있어요: ${outcome.missing.join(", ")}` };
    case "failed":
      return { ok: false, message: `수집 실패: ${outcome.error}` };
  }
}
