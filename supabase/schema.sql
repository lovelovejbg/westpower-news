-- ═══════════════════════════════════════════════════════════════════
-- 서부발전 뉴스 브리핑 — DB 표 만들기
-- Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여 넣고 Run.
-- 여러 번 실행해도 안전하다(이미 있으면 건너뛰거나 덮어쓴다).
--
-- 표 3개
--   sources       출처와 이용 조건(장기 저장 / 임시 캐시, 보관 일수, 전문·사진·요약 허용)
--   articles      기사. 같은 dedup_key 는 한 번만 저장된다.
--   collect_runs  수집 기록(시작·종료, 성공 여부, 새 기사 수, 오류)
--
-- 보안
--   - 공개용 키(anon / publishable)는 "읽기"만 된다. 쓰기 정책을 아예 만들지 않는다.
--   - 쓰기는 서버의 secret 키(RLS 를 우회)로만 한다 → 3단계 수집 기능.
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────── 1. 출처 ─────────────────────────
create table if not exists public.sources (
  id              text primary key,                  -- 예: 'naver', 'test'
  label           text not null,                     -- 화면에 보일 이름
  -- long_term : 장기 저장이 허락된 출처
  -- temp_cache: 표시 + 임시 캐시만 허락된 출처(예: 네이버 검색 API) → retention_days 필수
  storage_policy  text not null check (storage_policy in ('long_term', 'temp_cache')),
  retention_days  integer check (retention_days is null or retention_days > 0),
  allow_full_text boolean not null default false,    -- 전문 저장·표시 허락
  allow_images    boolean not null default false,    -- 사진 표시 허락
  allow_summary   boolean not null default false,    -- 요약 저장·표시 허락(발췌와 다름)
  enabled         boolean not null default true,
  note            text,                              -- 이용 조건 근거(약관 주소 등)
  created_at      timestamptz not null default now(),
  -- 임시 캐시 출처는 반드시 보관 일수가 있어야 한다.
  constraint sources_temp_needs_retention
    check (storage_policy = 'long_term' or retention_days is not null)
);


-- ───────────────────────── 2. 기사 ─────────────────────────
create table if not exists public.articles (
  id                 uuid primary key default gen_random_uuid(),
  source_id          text not null references public.sources(id),
  -- 같은 기사 판별 키 = 출처 + 정규화한 원문 주소. 다시 수집해도 중복 저장되지 않는다.
  -- (제목이 비슷하다고 다른 언론사 기사를 합치지 않기 위해 제목은 쓰지 않는다.)
  dedup_key          text not null unique,
  title              text not null check (length(btrim(title)) between 1 and 500),
  description        text,                           -- 카드에 보일 요약 또는 발췌
  -- 요약 칸 글의 종류: licensed(허락된 요약) / snippet(검색 발췌) / demo(시연·테스트) / none(없음)
  summary_kind       text not null default 'none'
                     check (summary_kind in ('licensed', 'snippet', 'demo', 'none')),
  key_points         text[] not null default '{}',   -- 핵심 내용(허락된 출처만)
  full_text          text,                           -- 전문(허락된 출처만)
  press              text not null check (length(btrim(press)) between 1 and 100),
  url                text not null check (url ~ '^https?://'),
  image_url          text check (image_url is null or image_url ~ '^https?://'),
  image_allowed      boolean not null default false,
  category           text not null default '기타'
                     check (category in ('경영', '안전', '에너지전환', '사회공헌', '지역', '기타')),
  published_at       timestamptz,                    -- 출처가 주지 않으면 null
  first_collected_at timestamptz not null default now(),
  -- 아래 세 칸은 트리거가 자동으로 채운다(직접 넣어도 덮어쓴다).
  kst_date           date not null,                  -- KST 발행일, 없으면 KST 수집일
  date_basis         text not null check (date_basis in ('published', 'collected')),
  expires_at         timestamptz,                    -- 임시 캐시 출처만. 지나면 화면에서 숨고 정리 대상.
  is_demo            boolean not null default false, -- 시연·테스트 데이터 표시
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- 설명이 있으면 종류를 꼭 밝힌다.
  constraint articles_description_kind
    check ((description is null) = (summary_kind = 'none'))
);

-- 날짜별 조회가 빠르도록
create index if not exists articles_kst_date_idx
  on public.articles (kst_date, published_at desc nulls last);
create index if not exists articles_expires_idx
  on public.articles (expires_at) where expires_at is not null;


-- 트리거: 날짜 칸 계산 + 출처 이용 조건을 DB 에서도 강제
create or replace function public.articles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  src public.sources%rowtype;
begin
  select * into src from public.sources where id = new.source_id;
  if not found then
    raise exception '등록되지 않은 출처입니다: %', new.source_id;
  end if;
  if not src.enabled then
    raise exception '사용 중지된 출처입니다: %', new.source_id;
  end if;

  -- 허락되지 않은 내용은 저장 자체를 거부한다.
  if new.full_text is not null and not src.allow_full_text then
    raise exception '출처 %는 전문 저장이 허락되지 않았습니다', new.source_id;
  end if;
  if new.image_allowed and not src.allow_images then
    raise exception '출처 %는 사진 사용이 허락되지 않았습니다', new.source_id;
  end if;
  if new.summary_kind = 'licensed' and not src.allow_summary then
    raise exception '출처 %는 요약 저장이 허락되지 않았습니다', new.source_id;
  end if;
  if cardinality(new.key_points) > 0 and not src.allow_summary then
    raise exception '출처 %는 핵심 내용 저장이 허락되지 않았습니다', new.source_id;
  end if;

  -- 날짜 칸: KST 발행일, 발행 시각이 없으면 KST 수집일(그리고 그 사실을 기록)
  new.kst_date   := (coalesce(new.published_at, new.first_collected_at) at time zone 'Asia/Seoul')::date;
  new.date_basis := case when new.published_at is null then 'collected' else 'published' end;

  -- 만료 시각: 임시 캐시 출처만. 처음 수집한 때부터 보관 일수만큼.
  new.expires_at := case
    when src.storage_policy = 'temp_cache'
      then new.first_collected_at + make_interval(days => src.retention_days)
    else null
  end;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists articles_before_write on public.articles;
create trigger articles_before_write
  before insert or update on public.articles
  for each row execute function public.articles_before_write();


-- ───────────────────────── 3. 수집 기록 ─────────────────────────
create table if not exists public.collect_runs (
  id          bigint generated always as identity primary key,
  source_id   text not null references public.sources(id),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running', 'success', 'failed')),
  new_count   integer not null default 0 check (new_count >= 0),
  error       text,                                   -- 관리자만 보는 오류 내용
  kst_date    date generated always as ((started_at at time zone 'Asia/Seoul')::date) stored
);

create index if not exists collect_runs_kst_date_idx on public.collect_runs (kst_date, started_at desc);
-- 같은 출처의 수집이 동시에 두 개 돌지 못하게 한다(3단계 동시 실행 방지).
create unique index if not exists collect_runs_one_running
  on public.collect_runs (source_id) where status = 'running';


-- ───────────────────────── 4. 만료 기사 정리 ─────────────────────────
-- 3단계에서 pg_cron 으로 주기 실행한다. 지금은 SQL Editor 에서 select public.purge_expired_articles(); 로 직접 실행 가능.
create or replace function public.purge_expired_articles()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.articles
    where expires_at is not null and expires_at <= now()
    returning 1
  )
  select count(*)::integer from deleted;
$$;
revoke execute on function public.purge_expired_articles() from public, anon, authenticated;


-- ───────────────────────── 5. 권한(RLS) ─────────────────────────
alter table public.sources      enable row level security;
alter table public.articles     enable row level security;
alter table public.collect_runs enable row level security;

-- 표 권한: 공개용 키는 읽기만. (쓰기 권한 자체를 주지 않는다)
revoke all on public.sources, public.articles, public.collect_runs from anon, authenticated;
grant select on public.sources, public.articles to anon, authenticated;
-- 수집 기록은 오류 내용(error)을 빼고 공개한다.
grant select (id, source_id, started_at, finished_at, status, new_count, kst_date)
  on public.collect_runs to anon, authenticated;

drop policy if exists "sources 누구나 읽기" on public.sources;
create policy "sources 누구나 읽기" on public.sources
  for select to anon, authenticated using (true);

-- 만료된 기사는 정리 전이라도 화면에 보이지 않게 한다.
drop policy if exists "articles 만료 전 기사 읽기" on public.articles;
create policy "articles 만료 전 기사 읽기" on public.articles
  for select to anon, authenticated using (expires_at is null or expires_at > now());

drop policy if exists "collect_runs 누구나 읽기" on public.collect_runs;
create policy "collect_runs 누구나 읽기" on public.collect_runs
  for select to anon, authenticated using (true);


-- ───────────────────────── 6. 기본 출처 ─────────────────────────
-- 'test' : 화면 확인용(test-data.sql). 임시 캐시 7일 → 만료 동작도 같이 확인된다.
-- 실제 출처(네이버 등)는 3단계에서 이용 조건을 확인한 뒤 추가한다.
insert into public.sources (id, label, storage_policy, retention_days, note)
values ('test', '테스트 데이터', 'temp_cache', 7, '화면 확인용. 실제 기사 아님.')
on conflict (id) do nothing;

-- 결과 확인
select id, label, storage_policy, retention_days from public.sources;
