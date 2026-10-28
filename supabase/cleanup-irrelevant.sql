-- 이미 저장된 네이버 기사 중 서부발전과 관련 없는 것 지우기 (한 번만 실행하면 된다).
-- 기준은 앱의 수집 필터(src/lib/news/sources/naver.ts isAboutWestPower)와 같다:
--   제목 + 발췌문에서 띄어쓰기를 없앤 글에 '서부발전' 또는 'KOWEPO'(대소문자 무시)가 없으면 삭제.

-- ① 먼저 지워질 기사 수와 예시를 확인
select count(*) as 지워질_기사_수
from public.articles
where source_id = 'naver'
  and regexp_replace(title || ' ' || coalesce(description, ''), '\s', '', 'g') !~* '서부발전|kowepo';

-- ② 삭제
delete from public.articles
where source_id = 'naver'
  and regexp_replace(title || ' ' || coalesce(description, ''), '\s', '', 'g') !~* '서부발전|kowepo';

-- ③ 남은 네이버 기사 수
select count(*) as 남은_네이버_기사_수 from public.articles where source_id = 'naver';
