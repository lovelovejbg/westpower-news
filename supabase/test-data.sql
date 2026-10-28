-- ═══════════════════════════════════════════════════════════════════
-- 화면 확인용 테스트 데이터 (실제 기사 아님)
-- schema.sql 을 먼저 실행한 뒤, SQL Editor 에서 Run.
-- 지우기: test-data-cleanup.sql
--
-- 넣는 것
--   - 오늘(KST) 성공한 수집 기록 1건
--   - 오늘 발행 [테스트] 기사 1건
--   - 발행 시각이 없는 [테스트] 기사 1건 → 날짜 기준이 '수집일'로 자동 기록되는지 확인
--   - 같은 주소의 기사를 한 번 더 넣기 → 중복 저장되지 않는지 확인
-- ═══════════════════════════════════════════════════════════════════

insert into public.collect_runs (source_id, started_at, finished_at, status, new_count)
values ('test', now() - interval '5 minutes', now() - interval '4 minutes', 'success', 2);

insert into public.articles
  (source_id, dedup_key, title, description, summary_kind, press, url, category, published_at, is_demo)
values
  ('test', 'test:https://example.com/test-news/1',
   '[테스트] DB 연결 확인용 기사 1 — 발행 시각 있음',
   'Supabase 에 저장된 테스트 데이터입니다. 실제 기사가 아니며 사실·수치·인용을 담고 있지 않습니다.',
   'demo', '테스트언론', 'https://example.com/test-news/1', '안전', now() - interval '1 hour', true),
  ('test', 'test:https://example.com/test-news/2',
   '[테스트] DB 연결 확인용 기사 2 — 발행 시각 없음',
   null, 'none', '테스트언론', 'https://example.com/test-news/2', '기타', null, true)
on conflict (dedup_key) do nothing;

-- 중복 확인: 같은 dedup_key 를 다시 넣어도 아무 일도 일어나지 않아야 한다.
insert into public.articles
  (source_id, dedup_key, title, press, url, is_demo)
values
  ('test', 'test:https://example.com/test-news/1', '[테스트] 중복 — 저장되면 안 됨', '테스트언론', 'https://example.com/test-news/1', true)
on conflict (dedup_key) do nothing;

-- 결과: 2건이어야 한다. date_basis 가 1번은 published, 2번은 collected. expires_at 은 7일 뒤.
select title, kst_date, date_basis, expires_at
from public.articles
where source_id = 'test'
order by dedup_key;
