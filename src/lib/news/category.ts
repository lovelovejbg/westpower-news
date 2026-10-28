// 분류별 색과 아이콘. 사진을 쓸 수 없는 기사는 이 색·아이콘으로 카드를 꾸민다.
// Tailwind는 코드에 "글자 그대로" 적힌 클래스만 CSS로 만들기 때문에
// 클래스 이름을 조립하지 말고 아래처럼 통째로 적어 둔다.

import type { Category } from "./types";

export interface CategoryStyle {
  /** 태그(작은 알약 모양) 색 */
  tag: string;
  /** 카드 위쪽 그림 자리(사진 대신) 배경 색 */
  panel: string;
  /** 아이콘 색 */
  icon: string;
  /** 24x24 SVG path 데이터 */
  iconPath: string;
}

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  경영: {
    tag: "bg-blue-50 text-blue-700 ring-blue-200",
    panel: "from-blue-50 to-blue-100",
    icon: "text-blue-600",
    // 막대그래프
    iconPath: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  },
  안전: {
    tag: "bg-amber-50 text-amber-800 ring-amber-200",
    panel: "from-amber-50 to-amber-100",
    icon: "text-amber-600",
    // 방패
    iconPath: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z",
  },
  에너지전환: {
    tag: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    panel: "from-emerald-50 to-emerald-100",
    icon: "text-emerald-600",
    // 번개
    iconPath: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  },
  사회공헌: {
    tag: "bg-rose-50 text-rose-700 ring-rose-200",
    panel: "from-rose-50 to-rose-100",
    icon: "text-rose-600",
    // 하트
    iconPath: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  },
  지역: {
    tag: "bg-violet-50 text-violet-700 ring-violet-200",
    panel: "from-violet-50 to-violet-100",
    icon: "text-violet-600",
    // 위치 핀
    iconPath: "M12 21s-6-5.3-6-11a6 6 0 1112 0c0 5.7-6 11-6 11zm0-8.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  },
  기타: {
    tag: "bg-slate-100 text-slate-700 ring-slate-200",
    panel: "from-slate-50 to-slate-100",
    icon: "text-slate-500",
    // 신문
    iconPath: "M4 5h13v14H6a2 2 0 01-2-2V5zm13 4h3v8a2 2 0 01-2 2M8 9h5M8 13h5",
  },
};
