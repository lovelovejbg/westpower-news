# CLAUDE.md — 서부발전 뉴스 브리핑

@AGENTS.md

## 무엇을 만드나
한국서부발전 관련 뉴스를 수집해 날짜별 "겹친 카드"로 보여 주는 웹앱.
흐름: 수집 → 허용된 내용만 정리 → DB 저장 → 날짜별 조회 → 카드 상세

## 기술 스택
- Next.js 16 (App Router, Cache Components 켜짐) + TypeScript + Tailwind CSS v4
- DB: Supabase(PostgreSQL) — 뉴스 브리핑 전용 프로젝트 (환경변수 `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY`)
- 배포: Vercel
- 시간대: 모든 날짜·시각은 Asia/Seoul(KST). `src/lib/news/date.ts` 의 함수만 쓴다.

## 폴더
- `src/app/page.tsx` — 첫 화면. `?date=yyyy-mm-dd` 를 읽어 그날 뉴스를 보여 준다.
- `src/components/` — DateNav(날짜) · CardStack(겹친 카드) · NewsCard(카드 한 장) · DetailModal(상세) · CollectStatus(수집 상태) · EmptyState(빈 상태)
- `src/lib/news/types.ts` — 기사·하루치 결과 타입 (DB 열과 맞춘다)
- `src/lib/news/repository.ts` — 화면이 데이터를 받는 유일한 입구 (서버 전용)
- `src/lib/news/demo-data.ts` — '시연용 데이터' 생성기 (DB 환경변수가 없을 때만 사용)
- `src/lib/news/supabase.ts` — 서버 전용 읽기 클라이언트 (공개용 키, RLS 로 읽기만)
- `supabase/schema.sql` — 표 · 권한 · 트리거. DB 구조를 바꾸면 이 파일도 함께 고친다(다시 실행해도 안전하게).
- `supabase/stage3.sql` — 네이버 출처 등록 · 매시 수집/만료 삭제 예약(pg_cron). 토큰 값은 파일에 넣지 않고 Vault 에.
- `src/lib/news/sources/` · `collect.ts` — 출처 모듈과 수집 흐름 / `src/lib/admin/auth.ts` — 관리자 · 예약 호출 권한 확인
- `supabase/test-data*.sql` — 연결 확인용 `[테스트]` 데이터 넣기 / 지우기

## DB 규칙
- DB 가 연결되면 시연용 데이터를 섞지 않는다.
- 출처 이용 조건(`sources`)은 DB 트리거가 강제한다. 앱에서 우회하지 않는다.
- 쓰기는 서버 비밀 키로만. 공개 키에는 쓰기 정책을 만들지 않는다. `collect_runs.error` 는 공개하지 않는다.

## 단계 (우선순위: 날짜 탐색 → 겹친 카드 → 상세 보기 → DB 저장·조회 → 뉴스 자동 수집)
- 1단계: 날짜 탐색 · 겹친 카드 · 상세 보기 — 완료 (시연용 데이터)
- 2단계: DB 저장 · 조회 (Supabase) — 완료
- 3단계: 뉴스 자동 수집 (출처 모듈 · 관리자 '지금 수집' · 수집 기록) — 네이버 검색 API

## 네이버 검색 API 규칙 (약관 '네이버 검색 API 서비스' 2.1~2.4)
- 화면에 "네이버 검색결과" 표시. 원문 · 네이버 링크 제공.
- 가공 금지: 강조 태그 · HTML 기호 정리만. 분류 · 언론사 이름 추측 금지, 앞뒤 · 중간에 다른 내용 끼워 넣지 않기, 순서 바꾸지 않기(최신순).
- AI 입력 · 요약 금지, 광고 금지.
- 서버 보관 최대 21일 → sources.retention_days = 20. 만료 기사는 RLS 로 즉시 숨기고 매시간 삭제.
- 보관 기한보다 오래된 기사는 저장하지 않는다.
- 관련성 필터: 제목 · 발췌문(띄어쓰기 무시)에 '서부발전' / 'KOWEPO' 가 없으면 저장하지 않는다. 걸러 내기만 하고 내용 · 순서는 바꾸지 않는다.
  기준을 바꾸면 `naver.ts isAboutWestPower` 와 `supabase/cleanup-irrelevant.sql` 을 함께 고친다.

## 작업 방식
- 고칠 파일과 이유를 먼저 보여 주고 승인을 받은 뒤 만든다.
- 한 번에 한 단계씩. 끝나면 바꾼 파일 · 확인 방법 · 남은 문제를 보고한다.
- 연결되지 않은 기능을 된 것처럼 보이게 하지 않는다. 확인된 것과 설정이 필요한 것을 나눠 보고한다.

## 콘텐츠 규칙 (가장 중요)
- 사실 · 수치 · 인용을 지어내지 않는다. 시연용 문장은 `[시연용]` 표시와 `isDemo: true` 로 실제 데이터와 구분한다.
- 검색 API 발췌문(snippet)을 요약처럼 보이게 하지 않는다 → `summaryKind` 로 구분해 화면에 밝힌다.
- 전문 · 핵심 내용 · 사진은 출처가 이용을 허락한 경우에만 저장 · 표시한다.
- RSS 가 있다고 저장 · 재사용 권리가 있다고 가정하지 않는다.
- 네이버 검색 API 결과는 표시 + 허용된 임시 캐시만. 장기 저장 · AI 요약 금지.
- 수집 결과가 네이버/구글 검색 결과와 같거나 빠짐없다고 말하지 않는다.
- 과거 날짜 기사를 나중에 모두 채울 수 있다고 가정하지 않는다.
- 같은 기사 판별은 출처 + 정규화한 원문 주소(dedupKey)로. 제목이 비슷하다고 다른 언론사 기사를 합치지 않는다.

## 보안 규칙
- API 키 · DB 비밀키(service_role / secret)는 서버 환경변수에만. 코드 · 채팅 · GitHub 에 넣지 않는다.
- `NEXT_PUBLIC_` 이 붙은 환경변수에는 비밀 값을 넣지 않는다(브라우저에 공개됨).
- 수집 · 수정 기능은 서버에서 관리자 권한을 확인한다.
- `.env*` 파일은 커밋하지 않는다(.gitignore 에 포함). 예시는 `.env.example` 에만.
