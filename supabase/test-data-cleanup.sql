-- 테스트 데이터 지우기 (test-data.sql 로 넣은 것만). 실제 출처의 데이터는 건드리지 않는다.
delete from public.articles     where source_id = 'test';
delete from public.collect_runs where source_id = 'test';

select
  (select count(*) from public.articles     where source_id = 'test') as 남은_테스트_기사,
  (select count(*) from public.collect_runs where source_id = 'test') as 남은_테스트_수집기록;
