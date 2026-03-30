# 📖 N-Side Pro 개발 명세서 (Specification)

> **목적**: 현재 구현 상태를 정확히 파악하고, 수정·테스트·추가 개발 시 기준으로 삼기 위한 문서입니다.  
> **최종 업데이트**: 2026-03-30

---

## 📋 목차

1. [전체 구조 한눈에 보기](#1-전체-구조-한눈에-보기)
2. [기능별 구현 현황](#2-기능별-구현-현황)
3. [백엔드 API 전체 목록](#3-백엔드-api-전체-목록)
4. [데이터베이스 스키마](#4-데이터베이스-스키마)
5. [프론트엔드 페이지별 상세](#5-프론트엔드-페이지별-상세)
6. [미완성·목 데이터 목록](#6-미완성목-데이터-목록)
7. [외부 API 연동 현황](#7-외부-api-연동-현황)
8. [인증 시스템](#8-인증-시스템)
9. [알려진 제한사항](#9-알려진-제한사항)
10. [우선 개발 순서 추천](#10-우선-개발-순서-추천)

---

## 1. 전체 구조 한눈에 보기

```
사용자 브라우저
    │
    ▼
[React SPA 프론트엔드] ─── /login, /register, /dashboard 등 9개 페이지
    │
    │ fetch('/api/...')
    ▼
[Hono 백엔드 Worker] ─── Cloudflare Pages Functions (_worker.js)
    │
    ├── /api/auth/*        → 로그인·회원가입·관리자 승인
    ├── /api/generate      → Gemini AI 글 생성 (SSE 스트리밍)
    ├── /api/batch/*       → 배치 작업 관리
    ├── /api/keyword/*     → 키워드 분석
    ├── /api/history/*     → 생성 히스토리 CRUD
    ├── /api/schedule/*    → 발행 스케줄
    ├── /api/indexing/*    → IndexNow 제출
    ├── /api/schema/*      → JSON-LD 스키마 생성
    └── /api/pagespeed     → Core Web Vitals 조회
    │
    ├── [Cloudflare D1]    → SQLite DB (articles, keywords, schedules, users 등)
    └── [Cloudflare KV]    → 세션 캐시, 배치 작업 임시 저장
```

### 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, TypeScript, Tailwind CSS v4, Vite 6 |
| 백엔드 | Hono 4 (Cloudflare Workers) |
| DB | Cloudflare D1 (SQLite) |
| 캐시/세션 | Cloudflare KV |
| 배포 | Cloudflare Pages |
| AI | Google Gemini 1.5 Flash |
| 아이콘 | Lucide React |
| 차트 | Recharts |

---

## 2. 기능별 구현 현황

> 범례: ✅ 완전 구현 | 🟡 부분 구현 (목 데이터 혼재) | 🔴 미구현 (UI만 존재) | ⬛ 미시작

### 핵심 기능

| 기능 | 백엔드 | 프론트엔드 | 실제 동작 | 비고 |
|------|--------|-----------|----------|------|
| 로그인/회원가입 | ✅ | ✅ | ✅ | 완전 구현 |
| 관리자 승인 | ✅ | ✅ | ✅ | 완전 구현 |
| AI 글 생성 (SSE) | ✅ | ✅ | ✅ | Gemini API 키 필요 |
| AEO 점수 계산 | ✅ | ✅ | ✅ | 글 생성 완료 시 자동 계산 |
| JSON-LD 스키마 생성 | ✅ | ✅ | ✅ | Article/FAQ/HowTo 자동 감지 |
| 배치 글 생성 | 🟡 | ✅ | 🟡 | 프론트 루프 방식, 서버 큐 미구현 |
| 키워드 분석 | 🟡 | ✅ | 🟡 | 네이버 API 없으면 목 데이터 |
| 발행 스케줄 | 🟡 | 🟡 | 🔴 | DB 저장은 되나 실제 자동 발행 없음 |
| SEO 순위 모니터 | 🔴 | 🟡 | 🔴 | 랜덤값 반환 (실제 크롤링 없음) |
| 콘텐츠 노화 모니터 | ⬛ | 🟡 | 🔴 | UI만 있고 계산 로직 없음 |
| IndexNow 제출 | ✅ | ✅ | ✅ | IndexNow 키 필요 |
| 생성 히스토리 | ✅ | 🟡 | 🔴 | 백엔드 완성, 프론트가 목 데이터 사용 |
| Core Web Vitals | 🟡 | ✅ | 🟡 | 키 없으면 목 데이터 |
| 대시보드 통계 | 🔴 | 🟡 | 🔴 | 하드코딩 숫자 표시 |
| 토픽 클러스터 | 🔴 | 🟡 | 🔴 | 규칙 기반 목 데이터 |

---

## 3. 백엔드 API 전체 목록

### 인증 (`/api/auth`)

| 메서드 | 경로 | 인증 필요 | 설명 | 구현 |
|--------|------|----------|------|------|
| POST | `/api/auth/register` | ❌ | 회원가입 신청 | ✅ |
| POST | `/api/auth/login` | ❌ | 로그인 (토큰 발급) | ✅ |
| POST | `/api/auth/logout` | ✅ | 로그아웃 (세션 파기) | ✅ |
| GET | `/api/auth/me` | ✅ | 내 세션 정보 | ✅ |
| GET | `/api/auth/admin/users` | ✅ 관리자 | 전체 회원 목록 | ✅ |
| POST | `/api/auth/admin/approve` | ✅ 관리자 | 승인/거절 | ✅ |
| PATCH | `/api/auth/admin/users/:id/role` | ✅ 관리자 | 역할 변경 | ✅ |
| DELETE | `/api/auth/admin/users/:id` | ✅ 관리자 | 계정 삭제 | ✅ |

**주의**: 현재 API 라우트들(`/api/generate`, `/api/batch` 등)에는 **인증 미들웨어가 없습니다**.  
누구든 API 주소를 알면 직접 호출 가능한 상태입니다.

---

### 글 생성 (`/api/generate`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| POST | `/api/generate` | Gemini SSE 스트리밍 글 생성 | ✅ |

**요청 Body 예시:**
```json
{
  "keyword": "다이어트 식단",
  "settings": {
    "platform": "네이버 블로그",
    "contentType": "info",
    "wordCount": 2000,
    "h2Count": 4,
    "h3Count": 2,
    "tone": "professional",
    "writingStyle": "blog",
    "keywordDensity": 1.5,
    "includeLSI": true,
    "includeFAQ": true,
    "aeoOptimize": true,
    "humanizationLevel": "basic"
  },
  "apiKeys": {
    "gemini": "AIza..."
  }
}
```

**SSE 이벤트 종류:**
- `chunk` → `{ text: "..." }` — 텍스트 조각 스트리밍
- `complete` → `{ articleId, aeoScore, aeoBreakdown, schema, wordCount, readabilityScore }` — 완료
- `error` → `{ message: "..." }` — 오류

**AEO 점수 감점 기준:**
| 항목 | 감점 |
|------|------|
| 질문형 H2 없음 | -15점 |
| 상위 30% 내 핵심 답변 없음 | -15점 |
| 목차 없음 | -10점 |
| FAQ 섹션 없음 | -10점 |
| 통계/데이터 없음 | -8점 |
| 신뢰 신호 없음 | -7점 |
| 대화체 없음 | -5점 |
| 엔티티 언급 없음 | -5점 |

---

### 배치 (`/api/batch`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| POST | `/api/batch/start` | 배치 작업 시작 (KV 저장) | 🟡 |
| GET | `/api/batch/:id/status` | 작업 상태 조회 | 🟡 |
| POST | `/api/batch/:id/update` | 작업 상태 업데이트 | 🟡 |
| POST | `/api/batch/:id/cancel` | 작업 취소 | 🟡 |

**⚠️ 구조적 한계**: 현재 배치는 **프론트엔드에서 루프**를 돌며 `/api/generate`를 순차 호출합니다.  
서버 재시작 시 `batchJobs` 메모리 맵이 초기화됩니다. KV에 저장하지만 Cloudflare Workers는 상태 유지가 불가합니다.

---

### 키워드 (`/api/keyword`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| POST | `/api/keyword/analyze` | 키워드 분석 | 🟡 |
| GET | `/api/keyword/lists` | 키워드 목록 이름 조회 | ✅ |
| GET | `/api/keyword/list/:name` | 특정 목록 키워드 조회 | ✅ |
| POST | `/api/keyword/save` | 키워드 DB 저장 | ✅ |

**키워드 분석 상세:**
- 네이버 Client ID/Secret 없음 → **목 데이터 반환** (랜덤 수치)
- 네이버 검색 API 있음 → 검색 결과 수(경쟁도) 조회
- **월간 검색량**: 항상 랜덤값 ← 네이버 검색광고 API 별도 구현 필요

---

### 히스토리 (`/api/history`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| GET | `/api/history` | 글 목록 (페이지네이션, 필터) | ✅ |
| GET | `/api/history/:id` | 단일 글 조회 | ✅ |
| DELETE | `/api/history/:id` | 글 삭제 | ✅ |
| PATCH | `/api/history/:id/status` | 상태 변경 | ✅ |

**쿼리 파라미터 (GET /):**
- `page` — 페이지 번호 (기본 1)
- `platform` — 플랫폼 필터
- `status` — 상태 필터 (draft/published/scheduled/error)
- `search` — 키워드 검색

---

### 스케줄 (`/api/schedule`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| GET | `/api/schedule` | 스케줄 목록 (articles JOIN) | ✅ |
| POST | `/api/schedule` | 스케줄 등록 (충돌 감지) | ✅ |
| DELETE | `/api/schedule/:id` | 스케줄 삭제 | ✅ |
| POST | `/api/schedule/batch-distribute` | 배치 글 자동 날짜 배분 | ✅ |
| GET | `/api/schedule/optimal-times` | 최적 발행 시간 추천 | 🟡 |

**⚠️ 실제 자동 발행 없음**: 스케줄은 DB에 저장만 되며, 예약 시간에 자동으로 블로그에 발행하는 기능은 구현되지 않았습니다. Cloudflare Workers는 크론 트리거로 구현 가능합니다.

---

### 인덱싱 (`/api/indexing`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| POST | `/api/indexing/submit` | IndexNow API에 URL 제출 | ✅ |
| GET | `/api/indexing/history` | 제출 기록 조회 | ✅ |

**배치 크기**: 한 번에 최대 100개 URL을 묶어서 제출합니다.

---

### 스키마 (`/api/schema`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| POST | `/api/schema/generate` | JSON-LD 스키마 생성 | ✅ |

**자동 감지 유형:**
- 숫자 단계 포함 → `HowTo`
- Q:/A: 패턴 포함 → `FAQ`
- 리뷰/별점 포함 → `Review`
- 기본 → `Article`

---

### PageSpeed (`/api/pagespeed`)

| 메서드 | 경로 | 설명 | 구현 |
|--------|------|------|------|
| GET | `/api/pagespeed?url=...&apiKey=...` | Core Web Vitals 조회 | 🟡 |

- `apiKey` 없음 → **목 데이터 반환**
- `apiKey` 있음 → Google PageSpeed Insights API v5 호출

---

## 4. 데이터베이스 스키마

### articles (생성된 글)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| keyword | TEXT | 대상 키워드 |
| platform | TEXT | 네이버 블로그 (기본값) |
| content | TEXT | 마크다운 본문 |
| html_content | TEXT | HTML 변환본 (선택) |
| schema_json | TEXT | JSON-LD 스키마 (JSON 문자열) |
| word_count | INTEGER | 글자 수 |
| aeo_score | INTEGER | AEO 점수 (0–100) |
| readability_score | INTEGER | 가독성 점수 (0–100) |
| status | TEXT | draft / published / scheduled / error |
| created_at | DATETIME | 생성 시각 |
| published_at | DATETIME | 발행 시각 (nullable) |
| updated_at | DATETIME | 수정 시각 |

### keywords (키워드 데이터)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| keyword | TEXT UNIQUE | 키워드 (중복 불가) |
| list_name | TEXT | 키워드 목록 이름 |
| monthly_volume | INTEGER | 월간 검색량 |
| competition | INTEGER | 경쟁 문서 수 |
| saturation_score | INTEGER | 포화도 점수 (0–100) |
| difficulty | TEXT | 쉬움/보통/어려움/매우어려움 |
| last_analyzed | DATETIME | 마지막 분석 시각 |
| created_at | DATETIME | 등록 시각 |

### schedules (발행 스케줄)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| article_id | TEXT FK | articles.id 참조 |
| platform | TEXT | 발행 플랫폼 |
| scheduled_at | DATETIME | 예약 발행 시각 |
| status | TEXT | pending / published / failed |
| created_at | DATETIME | 등록 시각 |

### users (회원)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | 이메일 |
| password_hash | TEXT | SHA-256 해시 |
| name | TEXT | 이름 |
| role | TEXT | pending / approved / admin / rejected |
| request_message | TEXT | 가입 신청 메시지 |
| approved_at | DATETIME | 승인 시각 |
| approved_by | TEXT | 승인한 관리자 id |
| created_at | DATETIME | 가입 시각 |
| last_login | DATETIME | 마지막 로그인 |
| is_active | INTEGER | 1=활성, 0=비활성 |

### sessions (로그인 세션)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | users.id |
| token_hash | TEXT | 토큰 SHA-256 해시 |
| expires_at | DATETIME | 만료 시각 (7일) |
| created_at | DATETIME | 생성 시각 |
| ip_address | TEXT | 접속 IP (선택) |
| user_agent | TEXT | 브라우저 정보 (선택) |

### rank_tracking (순위 추적)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| keyword | TEXT | 추적 키워드 |
| naver_rank | INTEGER | 네이버 순위 (nullable) |
| google_rank | INTEGER | 구글 순위 (nullable) |
| checked_at | DATETIME | 측정 시각 |

### indexing_log (인덱싱 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | UUID |
| url | TEXT | 제출한 URL |
| service | TEXT | indexnow (기본값) |
| status | TEXT | success / failed / error |
| submitted_at | DATETIME | 제출 시각 |

---

## 5. 프론트엔드 페이지별 상세

### `/login` — 로그인

- **상태**: ✅ 완전 구현
- 이메일/비밀번호 입력 → `/api/auth/login` POST
- 승인 대기 상태일 때 노란색 경고 메시지 표시
- 로그인 성공 시 토큰을 `localStorage`에 저장 후 `/dashboard`로 이동

---

### `/register` — 가입 신청

- **상태**: ✅ 완전 구현
- 이름/이메일/비밀번호/비밀번호확인/신청메시지 입력
- 첫 번째 가입자 → 자동 admin ("관리자 계정 생성 완료!" 화면)
- 이후 가입자 → pending ("가입 신청 완료!" 화면)

---

### `/dashboard` — 대시보드

- **상태**: 🔴 목 데이터
- **현재**: 통계 숫자가 하드코딩됨 (`totalArticles: 247` 등)
- **현재**: 최근 활동, 상위 키워드, 대기 작업이 모두 더미 데이터
- **필요 작업**: `/api/history`, `/api/keyword` 등에서 실제 데이터 fetch
- 차트(주간 글 수, AEO 점수)도 더미 데이터

---

### `/generate` — 글 생성

- **상태**: ✅ 핵심 기능 구현
- 왼쪽 패널: 키워드, 플랫폼, 콘텐츠 유형, 글자수, H2/H3 수, 어조, 문체, SEO 옵션, 인간화 옵션
- 오른쪽 패널: 미리보기 / 마크다운 / HTML / JSON-LD 탭
- SSE 스트리밍으로 실시간 텍스트 출력
- 생성 완료 시 AEO 점수 표시 (원형 게이지)
- 클립보드 복사, 재생성 버튼
- **⚠️ Gemini API 키 없으면 동작 안 함** (설정 페이지에서 입력 필요)

---

### `/batch` — 배치 생성

- **상태**: 🟡 부분 구현
- CSV 업로드 또는 직접 입력 (최대 100개 키워드)
- 시작/일시정지/재개/취소 버튼
- 15초 간격으로 순차 생성
- 완료 후 텍스트 파일 내보내기
- 자동 스케줄 배분 모달 (완료된 글 → `/api/schedule/batch-distribute`)
- **⚠️ 실제 서버 큐 없음**: 브라우저 창을 닫으면 배치 중단됨
- **⚠️ 배치 상태가 서버에 영구 저장 안 됨**: 페이지 새로고침 시 진행 상태 사라짐

---

### `/keywords` — 키워드 분석

- **상태**: 🟡 부분 구현
- 키워드 입력 → `/api/keyword/analyze` POST
- 네이버 API 없으면 샘플 데이터(노란색 배지 표시)
- 분석 결과: 월간 검색량, 경쟁도, 포화도, 난이도, 트렌드 차트, 연관 키워드
- 키워드 목록 저장/관리 (D1 DB 연동 완료)
- 토픽 클러스터 시각화: 시드 키워드 기반 **규칙으로 자동 생성** (실제 검색 아님)

---

### `/schedule` — 발행 스케줄

- **상태**: 🟡 부분 구현
- 캘린더 뷰(월/주/목록) 렌더링 완료
- **⚠️ 캘린더가 DB 데이터 대신 하드코딩 `MOCK_SCHEDULES` 사용**
- 최적 발행 시간 추천: `/api/schedule/optimal-times` (고정 반환값)
- 스케줄 추가/삭제 UI 완성
- **⚠️ 예약 시간이 지나도 자동 발행 없음** (알림 기능만 의도)

---

### `/monitor` — SEO 모니터

- **상태**: 🔴 목 데이터
- 순위 추적: `MOCK_RANKS` 하드코딩 데이터 사용
- "새로고침" 버튼 → `Math.random()`으로 순위 변경 (실제 크롤링 없음)
- 콘텐츠 노화: `MOCK_DECAY` 하드코딩 데이터
- AEO 모니터: URL 입력 후 체크 → `Math.random()`으로 결과 생성
- **구현 필요**: 네이버/구글 검색 API를 통한 실제 순위 조회

---

### `/indexing` — 인덱싱 도구

- **상태**: ✅ 핵심 기능 구현
- URL 목록 입력 → `/api/indexing/submit` POST → IndexNow API 실제 호출
- 제출 결과(성공/실패) 즉시 표시
- **⚠️ IndexNow 키 없으면 `your-indexnow-key`로 제출됨** (설정 필요)
- 스키마 생성기: 글 내용 붙여넣기 → `/api/schema/generate` POST
- 메타 태그 생성기: UI만 있음 (API 없음)
- Core Web Vitals: `/api/pagespeed` GET (키 없으면 목 데이터)

---

### `/history` — 생성 히스토리

- **상태**: 🔴 목 데이터 (백엔드는 완성)
- **⚠️ 프론트엔드가 `MOCK_ARTICLES` 사용**: `/api/history` API를 호출하지 않음
- 검색, 필터(플랫폼/상태/날짜/AEO), 정렬 UI 완성
- 글 선택 후 삭제/상태 변경 UI 완성
- **필요 작업**: `useEffect`에서 `/api/history`를 fetch하도록 수정

---

### `/settings` — 설정

- **상태**: ✅ 완전 구현
- API 키 탭: Gemini, OpenAI, Genspark, 네이버 (검색/검색광고/DataLab), IndexNow, PageSpeed, Bareun
- 키 테스트: Gemini는 실제 API 호출, 나머지는 성공 모의 응답
- 기본 설정 탭: 플랫폼, 글자수, 어조, 문체, 인간화 레벨, LSI/FAQ/AEO/스키마 토글
- 알림 설정 탭: 브라우저 푸시, 이메일, 순위/AEO 임계값
- **모든 설정은 `localStorage`에 저장** (서버에 저장 안 됨)

---

### `/admin/users` — 회원 관리 (관리자 전용)

- **상태**: ✅ 완전 구현
- 전체/대기/승인/관리자별 필터
- 승인/거절, 관리자 승격/강등, 계정 삭제
- 대기 회원 수 알림 배너
- 행 클릭 시 상세 정보 확장 (신청 메시지, 마지막 로그인 등)

---

## 6. 미완성·목 데이터 목록

아래 항목들은 **수정이 필요한 부분**입니다.

### 🔴 높은 우선순위 (실제 사용에 영향)

#### 1. `src/pages/History.tsx` — 목 데이터 제거, 실제 API 연동

```
현재: const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES)
수정: useEffect에서 fetch('/api/history')로 실제 데이터 불러오기
파일: src/pages/History.tsx (56번 줄)
```

#### 2. `src/pages/Dashboard.tsx` — 통계 실제 데이터 연동

```
현재: setTimeout으로 하드코딩 숫자 표시 (247, 89, 74, 12)
수정: /api/history, /api/keyword/lists 등에서 실제 집계값 fetch
파일: src/pages/Dashboard.tsx (96~108번 줄)
```

#### 3. `src/pages/Schedule.tsx` — 캘린더 DB 연동

```
현재: MOCK_SCHEDULES 하드코딩 배열 사용
수정: useEffect에서 fetch('/api/schedule')로 실제 스케줄 불러오기
파일: src/pages/Schedule.tsx (44번 줄)
```

---

### 🟡 중간 우선순위 (기능 품질 향상)

#### 4. `src/pages/Monitor.tsx` — 실제 순위 조회

```
현재: Math.random()으로 순위 생성
수정: 네이버/구글 검색 API 연동 or rank_tracking 테이블 활용
파일: src/pages/Monitor.tsx (103~104번 줄)
```

#### 5. `src/routes/keyword.ts` — 실제 월간 검색량

```
현재: Math.floor(Math.random() * 50000) + 1000
수정: 네이버 검색광고 API (relKwdStat) 연동
파일: src/routes/keyword.ts (32~33번 줄)
관련 API: https://searchad.naver.com → API 관리 → API 키 발급
```

#### 6. `src/routes/schedule.ts` — 최적 발행 시간 실제 분석

```
현재: 고정 배열 반환 (9시/14시/21시)
수정: schedules 테이블에서 실제 패턴 분석 후 반환
파일: src/routes/schedule.ts (optimal-times 엔드포인트)
```

---

### ⬛ 낮은 우선순위 (추가 기능)

#### 7. 자동 발행 기능 (Cloudflare Cron Trigger)

```
현재: 스케줄 저장만 되고 자동 발행 없음
구현: wrangler.jsonc에 cron 추가 + 발행 Worker 구현
예시: "0 * * * *" (매 시간마다 pending 스케줄 확인)
```

#### 8. 배치 서버 큐

```
현재: 브라우저에서 순차 호출 (창 닫으면 중단)
구현: Cloudflare Queue 또는 KV 기반 작업 큐로 서버 처리
```

#### 9. 랭크 트래킹 히스토리 DB 저장

```
현재: 순위 측정 결과가 저장 안 됨
구현: rank_tracking 테이블에 INSERT 후 차트에 표시
```

#### 10. 콘텐츠 노화(Content Decay) 실제 계산

```
현재: MOCK_DECAY 하드코딩
구현: published_at 기준 경과 일수 + AEO 점수 변화로 decay 계산
```

---

## 7. 외부 API 연동 현황

| API | 용도 | 키 이름 | 발급처 | 구현 상태 |
|-----|------|---------|--------|----------|
| **Google Gemini** | AI 글 생성 | `gemini` | aistudio.google.com | ✅ 필수 |
| **IndexNow** | 검색엔진 URL 제출 | `indexNowKey` | indexnow.org | ✅ 선택 |
| **Google PageSpeed** | Core Web Vitals | `pageSpeedKey` | console.cloud.google.com | 🟡 선택 |
| **네이버 검색 API** | 경쟁도 조회 | `naverClientId` + `naverClientSecret` | developers.naver.com | 🟡 선택 |
| **네이버 검색광고 API** | 월간 검색량 | `naverSearchAdKey` + 관련 키 | searchad.naver.com | 🔴 미구현 |
| **네이버 DataLab** | 트렌드 분석 | `naverDataLabKey` | developers.naver.com | 🔴 미구현 |
| **OpenAI** | 대체 AI (미구현) | `openai` | platform.openai.com | ⬛ 미구현 |
| **Bareun** | 한국어 교정 | `bareun` | bareun.ai | ⬛ 미구현 |
| **Genspark** | 추가 AI | `genspark` | genspark.ai | ⬛ 미구현 |

**모든 API 키는 `localStorage`에만 저장됩니다.**  
서버 환경변수가 아니므로 기기를 바꾸면 다시 입력해야 합니다.

---

## 8. 인증 시스템

### 토큰 구조

```
{base64(payload)}.{random_16chars}

payload: {
  sub: "user-uuid",
  role: "admin" | "approved",
  iat: 1234567890000,
  exp: 1234567890000  ← 7일 후
}
```

> ⚠️ **보안 주의**: 현재 토큰은 서명이 없습니다 (HMAC/RSA 미적용).  
> 누군가 base64를 디코딩하면 payload를 변조할 수 있습니다.  
> 실제 서비스 전 `HMAC-SHA256` 서명 추가 권장.

### 세션 검증 흐름

```
요청 도착
→ Authorization: Bearer {token} 헤더 파싱
→ base64 디코딩으로 exp(만료시간) 확인
→ KV에서 session:{userId} 캐시 조회
→ tokenHash 일치 확인
→ D1에서 user 조회 (role이 approved 또는 admin인지 확인)
→ 통과 or 401/403 반환
```

### 인증 가드 (프론트엔드)

| 컴포넌트 | 동작 |
|----------|------|
| `RequireAuth` | 로그인 없으면 `/login`으로 리다이렉트 |
| `RequireAdmin` | 로그인 없으면 `/login`, admin 아니면 `/dashboard` |
| `PublicRoute` | 이미 로그인되어 있으면 `/dashboard` |

### ⚠️ API 라우트 인증 없음

현재 `/api/generate`, `/api/keyword`, `/api/history` 등의 API는  
**Authorization 헤더 검증을 하지 않습니다**.  
API 주소를 알면 누구든 직접 호출 가능합니다.  
프로덕션 사용 전 미들웨어 추가 필요:

```typescript
// 추가가 필요한 미들웨어 예시
app.use('/api/generate', async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const session = await verifySession(token, c.env.DB, c.env.CACHE)
  if (!session) return c.json({ error: '인증이 필요합니다.' }, 401)
  await next()
})
```

---

## 9. 알려진 제한사항

| # | 항목 | 설명 |
|---|------|------|
| 1 | **API 키 보안** | 모든 키가 localStorage에 저장. 공용 PC에서 사용 금지 |
| 2 | **배치 안정성** | 브라우저 창 닫으면 배치 중단. 모바일 절전 모드에서도 중단 |
| 3 | **토큰 보안** | JWT 서명 없음. 실제 서비스 전 개선 필요 |
| 4 | **API 인증 없음** | /api/* 엔드포인트 토큰 검증 없음 |
| 5 | **자동 발행 없음** | 스케줄 저장만 됨. 실제 블로그 API 연동 없음 |
| 6 | **순위 조회 없음** | 모니터 페이지 순위가 랜덤값 |
| 7 | **다기기 설정** | API 키를 기기마다 다시 입력해야 함 |
| 8 | **글자수 제한** | Gemini 1.5 Flash 최대 8192 토큰 (약 4000 한글 자) |
| 9 | **청크 크기** | Vite 빌드 시 청크 경고 (>500KB). 코드 스플리팅 미적용 |
| 10 | **히스토리 목 데이터** | History 페이지가 실제 DB 대신 더미 데이터 표시 |

---

## 10. 우선 개발 순서 추천

### Phase 1 — 즉시 수정 (버그 수준)

> 배포 후 실제 사용 시 바로 이상함을 느끼는 것들

```
1. History 페이지 → /api/history 실제 연동
   파일: src/pages/History.tsx

2. Dashboard 통계 → /api/history count, /api/keyword/lists count 연동
   파일: src/pages/Dashboard.tsx

3. Schedule 캘린더 → /api/schedule 실제 연동
   파일: src/pages/Schedule.tsx
```

### Phase 2 — 중요 기능 완성

```
4. API 라우트에 인증 미들웨어 추가
   파일: src/index.tsx 또는 각 route 파일

5. 키워드 분석 - 네이버 검색광고 API 월간 검색량 연동
   파일: src/routes/keyword.ts

6. 토큰에 HMAC-SHA256 서명 추가
   파일: src/routes/auth.ts
```

### Phase 3 — 추가 기능

```
7. Cloudflare Cron Trigger로 스케줄 자동 실행
   파일: wrangler.jsonc + 새 파일 src/scheduled.ts

8. SEO 순위 모니터 - 실제 검색 결과 크롤링
   파일: src/routes/monitor.ts (신규)

9. 배치 서버 큐 (Cloudflare Queues)
   파일: src/routes/batch.ts 개선

10. 다기기 API 키 동기화 - KV나 DB에 암호화 저장
    파일: src/routes/settings.ts (신규)
```

---

> 📌 **이 문서는 코드 변경 시 함께 업데이트해주세요.**  
> 각 기능의 파일 경로와 줄 번호는 현재 코드 기준입니다.
