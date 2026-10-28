# 서부발전 뉴스 브리핑

한국서부발전 관련 뉴스를 날짜별 겹친 카드로 보여 주는 웹앱입니다.

> 현재 단계: **3단계(네이버 뉴스 자동 수집)** 코드 완료.
> DB 환경변수가 없으면 화면의 기사는 모두 **'시연용 데이터'** 입니다(실제 기사 아님).
> DB 가 연결되면 DB 에 있는 기사만 보여 주며 시연용 데이터를 섞지 않습니다.

## DB(Supabase) 연결

1. Supabase → SQL Editor 에서 `supabase/schema.sql` 전체를 실행 (표 3개 · 권한 · 트리거 생성)
2. 환경변수 2개를 넣기 (이름은 `.env.example` 참고)
   - 로컬: `.env.example` 을 `.env.local` 로 복사해 값 채우기
   - 배포: Vercel → Settings → Environment Variables → 넣은 뒤 Redeploy
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`(공개용 읽기 키)
3. (선택) `supabase/test-data.sql` 실행 → 오늘 날짜에 `[테스트]` 기사 2건이 보이면 연결 성공.
   확인 후 `supabase/test-data-cleanup.sql` 로 지우기.

DB 에서 정해 둔 것
- `sources` 출처별 이용 조건: 장기 저장 / 임시 캐시(보관 일수), 전문 · 사진 · 요약 허용 여부.
  허락되지 않은 내용은 DB 트리거가 저장을 거부한다.
- `articles` 같은 `dedup_key`(출처 + 정규화한 주소)는 한 번만 저장. `kst_date` 는 KST 발행일, 발행 시각이 없으면 수집일(`date_basis = 'collected'`).
  임시 캐시 출처의 기사는 `expires_at` 이 지나면 화면에서 숨고 `purge_expired_articles()` 로 지워진다.
- `collect_runs` 수집 기록. 같은 출처의 동시 수집은 DB 가 막는다. 오류 내용은 공개 키로 읽을 수 없다.
- 공개 키로는 읽기만 가능(쓰기 정책 없음). 쓰기는 3단계에서 서버 비밀 키로만.

날짜 상태: 기사 있음 → 카드 / 기사 없음 + 그날 성공한 수집 있음 → "뉴스가 없어요" / 실패만 있음 → 수집 실패 / 기록 없음 → "아직 수집 기록이 없어요"

## 실행 방법

필요한 것: Node.js 20.9 이상

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버 → http://localhost:3000
```

운영용 확인: `npm run build` 후 `npm run start`

## 화면에서 확인할 것 (시연용 데이터일 때)

| 주소 | 보이는 것 |
| --- | --- |
| `/` | 오늘(KST) 기사 12건 — 겹친 카드, `1 / 12` |
| `/?date=어제` | 1건 — 카드 한 장 |
| `/?date=그제` | 0건 — "수집된 뉴스가 없어요" |
| `/?date=사흘 전` | 수집 실패 안내 + 저장된 3건 |
| `/?date=2주 넘게 전` | "아직 수집 기록이 없어요" |
| `/?date=미래 또는 잘못된 값` | 오늘로 이동 |

조작: 날짜 화살표 · 날짜 눌러 달력 · '오늘' / 뒤 카드 클릭 · '이전/다음 기사' · 키보드 ← → · 휴대폰 좌우 밀기 / 앞 카드 클릭 → 상세, ESC 로 닫기

## 3단계: 네이버 뉴스 자동 수집

출처: 네이버 검색 API(뉴스) — [NAVER API HUB](https://api.ncloud-docs.com/docs/naver-api-hub-search-news) 경유, 검색어 '한국서부발전', 최신순.
2026-07-31 부터 네이버 개발자센터의 검색 API 신규 신청이 막혀 네이버 클라우드 플랫폼의 NAVER API HUB 에서 키를 받아야 합니다([공지](https://developers.naver.com/notice/article/32530)).
[이용약관](https://developers.naver.com/products/terms/) '네이버 검색 API 서비스'에 맞춘 것:

| 약관 | 이 앱에서 |
| --- | --- |
| 2.1 네이버 검색결과임을 표시 | 카드 · 상세에 "네이버 검색결과" 표시 |
| 2.2 가공 없이 노출, 출처 · 원본 링크 | 강조 태그 · HTML 기호만 글자로 되돌림. 분류 · 언론사 이름을 추측하지 않음(언론사 칸 = 원문 도메인). 원문 · 네이버 뉴스 링크 제공 |
| 2.3 AI 입력 · 광고 수익 금지 | AI 요약 없음, 광고 없음. 발췌문은 "검색 결과 발췌"로 표시 |
| 2.4 서버 보관 최대 21일, 경과 시 지체 없이 삭제 | 보관 20일. 만료 즉시 화면에서 숨김, 매시간 삭제 |

한계: 네이버 검색 결과가 서부발전 기사를 빠짐없이 담는다고 보장하지 않습니다. 수집을 시작하기 전 날짜는 채울 수 없고, 20일이 지난 날짜는 다시 비게 됩니다.

### 3단계 설정 순서

1. **무작위 값 2개 만들기** (`ADMIN_SESSION_SECRET`, `CRON_SECRET` 용). PowerShell 에서 두 번 실행:
   ```powershell
   # 32바이트 암호학적 난수 → 글자로 바꿔 출력
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
   ```
2. **Vercel 환경변수** (Settings → Environment Variables): `SUPABASE_SECRET_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`(NAVER API HUB 인증 정보),
   `ADMIN_PASSWORD`(10자 이상), `ADMIN_SESSION_SECRET`, `CRON_SECRET`
3. **Supabase Vault 에 호출 토큰 저장** — SQL Editor 에서 직접 입력하고 실행(이 줄은 파일로 저장하지 않기):
   ```sql
   select vault.create_secret('여기에 CRON_SECRET 과 같은 값', 'collect_cron_token');
   ```
4. **`supabase/stage3.sql` 실행** — 네이버 출처 등록, `portal_url` 칸 추가, 매시 수집 · 매시 만료 삭제 예약
5. Vercel **Redeploy** → `/admin` 로그인 → **지금 수집**

수집 주기 바꾸기: `stage3.sql` 4번 블록의 `'0 * * * *'` 를 고쳐 그 블록만 다시 실행.
예약 작업 실행 결과 확인: `select * from cron.job_run_details order by start_time desc limit 10;`

### 구조
- `src/lib/news/sources/` 출처 모듈(`naver.ts`). 새 출처는 `SourceModule` 모양으로 만들어 `index.ts` 에 등록
- `src/lib/news/collect.ts` 수집 한 번: 동시 실행 방지(DB) · 일시적 오류만 최대 2번 재시도 · 새 기사만 저장 · 기록
- `src/app/admin/` 관리자 로그인 · 지금 수집 · 수집 기록(오류 포함)
- `src/app/api/collect` 예약 작업용 주소(`Authorization: Bearer CRON_SECRET` 필요)
