-- 이미 저장된 네이버 기사 중 서부발전이 주제가 아닌 것 지우기 (기준을 바꾼 뒤 한 번 실행).
-- 기준은 앱의 수집 필터(src/lib/news/sources/naver.ts isAboutWestPower)와 같다:
--   제목에서 띄어쓰기를 없앤 글에 아래 말이 하나도 없으면 삭제(대소문자 무시).
--   서부발전 · KOWEPO · 태안발전본부 · 평택발전본부 · 서인천발전본부 · 군산발전본부

-- ① 지워질 기사 수 확인
select count(*) as 지워질_기사_수
from public.articles
where source_id = 'naver'
  and regexp_replace(title, '\s', '', 'g')
      !~* '서부발전|kowepo|태안발전본부|평택발전본부|서인천발전본부|군산발전본부';

-- ② 삭제
delete from public.articles
where source_id = 'naver'
  and regexp_replace(title, '\s', '', 'g')
      !~* '서부발전|kowepo|태안발전본부|평택발전본부|서인천발전본부|군산발전본부';

-- ③ 남은 네이버 기사 수
select count(*) as 남은_네이버_기사_수 from public.articles where source_id = 'naver';
