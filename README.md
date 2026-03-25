# N-Side Pro — 한국어 블로그 SEO 자동화 플랫폼

## 프로젝트 개요

N-Side Pro는 Gemini AI를 활용한 한국어 블로그 SEO 자동화 풀스택 플랫폼입니다.
Cloudflare Pages + Hono 백엔드 기반의 엣지 배포 환경에서 실행됩니다.

## 현재 완성된 기능

### 프론트엔드 (React + Vite + TypeScript + TailwindCSS)
- ✅ **대시보드** (`/dashboard`) — 통계 카드, 주간 차트, 상위 키워드, 최근 활동, 검토 대기 목록
- ✅ **글 생성** (`/generate`) — Gemini AI SSE 스트리밍, AEO 점수 실시간 계산, JSON-LD 스키마 자동 생성, 키워드 하이라이트, 인간화 미리보기
- ✅ **배치 생성** (`/batch`) — CSV 업로드, 순차 처리(15초 간격), 일시정지/재개/취소, 자동 일정 배분 모달
- ✅ **키워드 분석** (`/keywords`) — 검색량/경쟁도/포화도 분석, 키워드 목록 관리, 클러스터 시각화, Sparkline 트렌드
- ✅ **발행 스케줄** (`/schedule`) — 월간/주간/목록 캘린더, 최적 시간 추천, 충돌 감지
- ✅ **SEO 모니터** (`/monitor`) — 순위 추적(네이버/구글), 콘텐츠 노후화 감지, AEO 모니터
- ✅ **인덱싱 도구** (`/indexing`) — IndexNow 제출, 스키마 생성기, 메타 생성기, Core Web Vitals
- ✅ **생성 히스토리** (`/history`) — 글 목록, 필터링, 상태 관리, 콘텐츠 뷰어
- ✅ **설정** (`/settings`) — API 키 관리, 기본 설정, 알림 설정
- ✅ 사이드바 네비게이션 (데스크톱 접기/펼치기, 모바일 하단 탭바)
- ✅ 다크/라이트 모드 토글
- ✅ 토스트 알림 시스템
- ✅ 로딩 스켈레톤 UI

### 백엔드 (Hono on Cloudflare Workers)
- ✅ `POST /api/generate` — Gemini SSE 스트리밍 글 생성
- ✅ `POST /api/batch/start` — 배치 작업 시작
- ✅ `GET /api/batch/:batchId/status` — 배치 상태 조회
- ✅ `POST /api/keyword/analyze` — 키워드 분석
- ✅ `GET/POST /api/keyword/lists` — 키워드 목록 CRUD
- ✅ `POST /api/indexing/submit` — IndexNow 제출
- ✅ `GET /api/indexing/history` — 인덱싱 로그
- ✅ `POST /api/schema/generate` — JSON-LD 스키마 생성
- ✅ `GET /api/pagespeed` — PageSpeed Insights
- ✅ `GET/POST /api/history` — 히스토리 CRUD
- ✅ `GET/POST /api/schedule` — 스케줄 CRUD
- ✅ `POST /api/schedule/batch-distribute` — 배치 자동 배분
- ✅ `GET /api/schedule/optimal-times` — 최적 발행 시간
- ✅ `GET /api/health` — 헬스 체크

### 데이터베이스 (Cloudflare D1 SQLite)
- `articles` — 생성된 글 저장 (keyword, content, aeo_score, word_count, status, schema_json)
- `keywords` — 분석된 키워드 (list_name, monthly_volume, competition, saturation_score)
- `schedules` — 발행 예약 (article_id, platform, scheduled_at, status)
- `rank_tracking` — 순위 기록 (keyword, naver_rank, google_rank)
- `indexing_log` — 인덱싱 이력 (url, service, status)

## API 키 설정 방법

모든 API 키는 **브라우저 localStorage에만 저장**됩니다. `/settings` 페이지에서 설정하세요.

| 서비스 | 키 이름 | 필수 여부 |
|--------|--------|---------|
| Google Gemini | `gemini` | **필수** (글 생성) |
| Naver Client ID/Secret | `naverClientId`, `naverClientSecret` | 권장 (키워드 분석) |
| Naver SearchAd | `naverAdApiKey`, `naverAdSecretKey`, `naverAdCustomerId` | 선택 |
| IndexNow | `indexNowKey` | 인덱싱 기능용 |
| Google PageSpeed | `pageSpeedKey` | Core Web Vitals용 |

## 기술 스택

- **프론트엔드**: React 19 + Vite 6 + TypeScript + TailwindCSS 4
- **백엔드**: Hono 4 on Cloudflare Workers
- **데이터베이스**: Cloudflare D1 (SQLite), Cloudflare KV
- **AI**: Google Gemini 1.5 Flash (SSE 스트리밍)
- **빌드**: Vite (프론트) + esbuild (워커)
- **배포**: Cloudflare Pages

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# D1 로컬 마이그레이션
npm run db:migrate:local

# 빌드
npm run build

# PM2로 서버 시작
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npx wrangler pages dev dist --d1=nside-pro-production --local --ip 0.0.0.0 --port 3000
```

## 프로덕션 배포

```bash
# Cloudflare Pages 배포
npm run deploy
```

## 남은 작업 / 개선 사항

- [ ] Cloudflare Pages 실제 배포 (Cloudflare API 키 설정 필요)
- [ ] Naver DataLab API 연동으로 실제 검색량 데이터 조회
- [ ] Queues 바인딩을 통한 비동기 배치 처리
- [ ] 모바일 반응형 추가 테스트
- [ ] 청크 분할로 번들 크기 최적화 (현재 ~742KB)

## 배포 상태

- **플랫폼**: Cloudflare Pages (로컬 개발 서버)
- **상태**: ✅ 로컬 개발 서버 작동 중
- **마지막 업데이트**: 2026-03-25
