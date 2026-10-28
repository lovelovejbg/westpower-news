"use client";

// 화면을 그리다 오류가 나면(예: 2단계에서 DB 연결 실패) 이 화면이 대신 보인다.
// '다시 시도'를 누르면 데이터를 다시 받아 같은 화면을 다시 그려 본다(retry).

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-lg font-bold">뉴스를 불러오지 못했어요</p>
      <p className="mt-2 text-sm text-navy-soft">잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 알려 주세요.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-full bg-accent px-5 py-2 font-semibold text-white hover:bg-blue-700"
      >
        다시 시도
      </button>
    </main>
  );
}
