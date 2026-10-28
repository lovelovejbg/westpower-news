-- ═══════════════════════════════════════════════════════════════════
-- 3단계: 네이버 뉴스 수집 준비 + 매시간 자동 실행
-- schema.sql 다음에 SQL Editor 에서 Run. 여러 번 실행해도 안전하다.
--
-- 실행 전에 꼭: 수집 주소 호출용 토큰을 Vault 에 넣어 둔다(README '3단계 설정' 참고).
--   select vault.create_secret('<CRON_SECRET 과 같은 값>', 'collect_cron_token');
--   → 이 줄은 이 파일에 넣지 않는다. 토큰 값이 GitHub 에 올라가면 안 되기 때문.
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. 기사 표에 포털 주소 칸 추가 (2단계에서 만든 표에도 적용) ──
alter table public.articles
  add column if not exists portal_url text
  check (portal_url is null or portal_url ~ '^https?://');


-- ── 2. 네이버 출처 등록 ──
-- 네이버 개발자센터 이용약관 '네이버 검색 API 서비스' 2.4:
--   서버 보관은 "이력 조회 목적으로 최대 21일", 기간이 지나면 지체 없이 삭제.
--   → 하루 여유를 두고 20일. 만료되면 RLS 가 즉시 숨기고, 아래 정리 작업이 매시간 지운다.
-- 전문 · 사진 · 요약은 제공되지 않거나 허락되지 않으므로 모두 false (2.2 가공 금지, 2.3 AI 활용 금지).
insert into public.sources
  (id, label, storage_policy, retention_days, allow_full_text, allow_images, allow_summary, note)
values
  ('naver', '네이버 뉴스 검색', 'temp_cache', 20, false, false, false,
   '네이버 검색 API(뉴스). 약관 2.4 서버 보관 최대 21일 → 20일. https://developers.naver.com/products/terms/')
on conflict (id) do update set
  label = excluded.label,
  storage_policy = excluded.storage_policy,
  retention_days = excluded.retention_days,
  allow_full_text = excluded.allow_full_text,
  allow_images = excluded.allow_images,
  allow_summary = excluded.allow_summary,
  note = excluded.note;


-- ── 3. 예약 실행 기능 켜기 ──
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;


-- ── 4. 매시 정각: 수집 주소 호출 ──
-- 주기를 바꾸려면 아래 '0 * * * *' 를 고쳐 이 부분만 다시 실행한다.
--   예) 30분마다 '*/30 * * * *' / 3시간마다 '0 */3 * * *'
--   (네이버 검색 API 하루 호출 한도 25,000회. 한 번 수집에 1~3회 호출한다.)
select cron.schedule(
  'westpower-collect',
  '0 * * * *',
  $job$
  select net.http_post(
    url := 'https://westpower-news.vercel.app/api/collect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'collect_cron_token'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);


-- ── 5. 매시 5분: 만료된 기사 삭제 ──
select cron.schedule(
  'westpower-purge-expired',
  '5 * * * *',
  $job$ select public.purge_expired_articles(); $job$
);


-- 결과 확인: 출처 2개(test, naver), 예약 작업 2개가 보여야 한다.
select id, label, storage_policy, retention_days from public.sources order by id;
select jobname, schedule, active from cron.job where jobname like 'westpower-%' order by jobname;
