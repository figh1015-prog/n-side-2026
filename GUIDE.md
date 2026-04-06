# 📘 N-Side Pro 완전 초보자 가이드

> **이 가이드는 개발 경험이 없는 완전 초보자를 위해 작성되었습니다.**  
> 명령어 한 줄 한 줄이 무엇을 하는지, 왜 필요한지 설명합니다.

---

## 목차

1. [이 앱은 무엇을 하는 건가요?](#1-이-앱은-무엇을-하는-건가요)
2. [사용하기 위해 필요한 것들](#2-사용하기-위해-필요한-것들)
3. [처음 설치하기 (로컬 실행)](#3-처음-설치하기-로컬-실행)
4. [Cloudflare에 배포하기 (인터넷에 공개)](#4-cloudflare에-배포하기-인터넷에-공개)
5. [API 키 설정 방법](#5-api-키-설정-방법)
6. [기능별 사용 방법](#6-기능별-사용-방법)
7. [문제 해결 (오류가 났을 때)](#7-문제-해결-오류가-났을-때)
8. [현재 구현 상태 & 추후 개발 예정](#8-현재-구현-상태--추후-개발-예정)

---

## 1. 이 앱은 무엇을 하는 건가요?

**N-Side Pro**는 한국어 블로그 글을 AI로 자동 생성해주는 SEO 자동화 도구입니다.

### 주요 기능

| 기능 | 설명 | 현재 상태 |
|------|------|----------|
| 글 생성 | Gemini AI로 SEO 최적화 글 자동 작성 | ✅ 작동 (Gemini 키 필요) |
| 로그인/회원가입 | 관리자 승인 후 이용 가능 | ✅ 작동 |
| 키워드 분석 | 월간 검색량, 경쟁도 분석 | ✅ 작동 (네이버 키 필요 시 실제 데이터) |
| 히스토리 | 생성된 글 목록 및 관리 | ✅ DB 연동 완료 |
| 대시보드 | 실제 생성 통계 | ✅ DB 연동 완료 |
| 발행 스케줄 | 발행 일정 관리 | ✅ DB 연동 완료 |
| SEO 모니터 | 키워드 순위 추적 | ✅ DB 연동 완료 |
| 일괄 생성 | 여러 키워드 동시 처리 | 🟡 기본 작동 (브라우저 탭 열려 있어야 함) |
| IndexNow | 검색엔진 URL 즉시 제출 | ✅ 작동 (IndexNow 키 필요) |
| JSON-LD 스키마 | 구조화 데이터 자동 생성 | ✅ 작동 |
| PageSpeed | 페이지 속도 분석 | ✅ 작동 (PageSpeed 키 없으면 샘플 데이터) |
| 콘텐츠 노후화 | 트래픽 감소 감지 | 🔴 미구현 (Google Analytics 연동 필요) |
| 실제 블로그 자동 발행 | 네이버/티스토리/워드프레스에 직접 포스팅 | 🔴 미구현 |

---

## 2. 사용하기 위해 필요한 것들

### 필수 항목 (반드시 있어야 함)
- **컴퓨터** (Windows, Mac, Linux 모두 가능)
- **인터넷 연결**
- **Node.js** (JavaScript 실행 환경, 무료)
- **Cloudflare 계정** (서버 역할, 무료)
- **Google Gemini API 키** (AI 글 생성에 필요, 무료 티어 있음)

### 선택 항목 (있으면 더 잘 작동함)
- **네이버 개발자 계정** (키워드 분석, 무료)
- **네이버 검색광고 계정** (월간 검색량 실제 데이터, 광고 계정 필요)
- **IndexNow API 키** (검색엔진 URL 제출)
- **Google PageSpeed API 키** (페이지 속도 실제 데이터)

---

## 3. 처음 설치하기 (로컬 실행)

### 단계 1: Node.js 설치

1. 웹 브라우저에서 https://nodejs.org 접속
2. **"LTS" 버전** 다운로드 클릭 (LTS = 안정 버전)
3. 다운로드된 파일 실행 후 "다음 다음 다음..." 클릭하여 설치
4. 설치 완료 후 확인:
   - Windows: 시작 메뉴 → "명령 프롬프트" 검색 → 실행
   - Mac: Spotlight(⌘+스페이스) → "터미널" 검색 → 실행
   - 아래 명령어 입력:
   ```
   node --version
   ```
   - `v20.x.x` 같은 숫자가 나오면 설치 성공!

### 단계 2: 코드 내려받기 (GitHub)

```bash
# GitHub에서 코드 복사
git clone https://github.com/figh1015-prog/n-side-2026.git

# 폴더 이동
cd n-side-2026
```

> ⚠️ `git` 명령어가 없다고 나오면?  
> https://git-scm.com/downloads 에서 Git 설치 후 다시 시도

### 단계 3: 필요한 패키지 설치

```bash
# 패키지 설치 (시간이 좀 걸림, 3~5분)
npm install
```

> 💡 이 명령어는 `package.json`에 적힌 라이브러리들을 자동으로 설치합니다.  
> `node_modules` 폴더가 생기면 성공입니다.

### 단계 4: Cloudflare Wrangler 로그인

```bash
# Cloudflare에 로그인 (브라우저 창이 열림)
npx wrangler login
```

> 브라우저에서 Cloudflare 계정으로 로그인하면 터미널에 "Successfully logged in" 메시지가 나옵니다.

### 단계 5: 데이터베이스 만들기

```bash
# D1 데이터베이스 생성
npx wrangler d1 create nside-pro-production
```

실행하면 아래와 같은 내용이 출력됩니다:
```
✅ Successfully created DB 'nside-pro-production'

[[d1_databases]]
binding = "DB"
database_name = "nside-pro-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 이 ID를 복사!
```

**중요:** `database_id` 값을 복사해두세요!

### 단계 6: wrangler.jsonc 수정

텍스트 에디터(메모장, VSCode 등)로 `wrangler.jsonc` 파일을 열고:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nside-pro-production",
    "database_id": "여기에-복사한-ID-붙여넣기"  ← 여기 수정!
  }
]
```

> VSCode를 사용하면 편합니다. https://code.visualstudio.com 에서 무료로 받을 수 있습니다.

### 단계 7: KV 네임스페이스 만들기 (세션 저장용)

```bash
npx wrangler kv namespace create CACHE
```

출력 예시:
```
✅ Created namespace "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxx"  ← 이 ID 복사!
```

`wrangler.jsonc`의 KV 부분도 수정:
```jsonc
"kv_namespaces": [
  {
    "binding": "CACHE",
    "id": "여기에-복사한-KV-ID",
    "preview_id": "여기에도-같은-KV-ID"
  }
]
```

### 단계 8: 로컬 데이터베이스 테이블 생성

```bash
# 테이블 생성 (로컬)
npx wrangler d1 migrations apply nside-pro-production --local
```

성공하면:
```
✅ 0001_initial_schema.sql
✅ 0002_add_users.sql
```

### 단계 9: 로컬에서 실행

```bash
# 빌드
node build-worker.mjs

# 실행
npx wrangler pages dev dist --d1=nside-pro-production --local --ip 0.0.0.0 --port 8788
```

브라우저에서 `http://localhost:8788` 접속 → 로그인 화면 보이면 성공!

---

## 4. Cloudflare에 배포하기 (인터넷에 공개)

### 단계 1: 원격 DB에 테이블 생성

```bash
# 원격(실제 Cloudflare) DB에 테이블 생성
npx wrangler d1 migrations apply nside-pro-production --remote
```

> `--local`을 `--remote`로 바꾸면 실제 클라우드 DB에 적용됩니다.

### 단계 2: 배포

```bash
# 빌드 + 배포 한번에
node build-worker.mjs && npx wrangler pages deploy dist --project-name nside-pro
```

처음 배포하면 물어볼 수 있어요:
```
No project found. Would you like to create one? » Yes
```
→ Enter 누르세요.

### 단계 3: 배포 완료 확인

배포가 완료되면 URL이 나옵니다:
```
✅ Deployment complete!
  https://nside-pro.pages.dev
```

이 URL을 브라우저에서 열어보세요.

### 단계 4: 처음 계정 만들기

1. 배포된 URL로 접속
2. "회원가입" 클릭
3. 이메일, 비밀번호 입력
4. **첫 번째 가입자는 자동으로 관리자가 됩니다!**
5. 바로 로그인 가능

---

## 5. API 키 설정 방법

배포 후 로그인 → 설정 페이지(/settings)에서 API 키를 입력합니다.

### Google Gemini API 키 (글 생성에 필수)

1. https://aistudio.google.com 접속
2. 구글 계정으로 로그인
3. 왼쪽 메뉴 "Get API key" 클릭
4. "Create API key" 버튼 클릭
5. 생성된 키(`AIza...`로 시작)를 복사
6. N-Side Pro 설정 → "Google Gemini API Key" 입력

> ⚠️ **보안 주의:** API 키는 절대 다른 사람에게 알려주거나 GitHub에 올리지 마세요!  
> 키가 노출되면 요금이 청구될 수 있습니다.

### 네이버 검색 API 키 (키워드 경쟁도 분석)

> 💡 **없어도 됩니다!** API 키 없이도 추정치로 분석되며, 정확도가 다소 낮습니다.

1. https://developers.naver.com 접속
2. 로그인 → "Application" → "애플리케이션 등록"
3. 애플리케이션 이름 입력 (예: "N-Side Pro")
4. 사용 API에서 "검색" 선택
5. 서비스 URL 입력 (배포된 Cloudflare URL)
6. 등록 완료 후 "Client ID"와 "Client Secret" 복사
7. N-Side Pro 설정에 입력

### 네이버 검색광고 API 키 (월간 검색량 실제 데이터)

> 💡 **없어도 됩니다!** 없으면 추정치를 사용합니다. 실제 검색량을 보려면 아래 단계를 따르세요.

1. https://searchad.naver.com 접속 (네이버 광고 계정 필요)
2. 로그인 → 도구 → API 관리
3. "API 사용 신청" 클릭
4. 신청 승인 후 "API 키", "Secret 키", "고객 ID" 확인
5. N-Side Pro 설정에 세 가지 모두 입력

### IndexNow API 키 (URL 즉시 색인 요청)

> IndexNow는 Bing, Yandex, Naver 등에 글 발행 즉시 알려주는 서비스입니다.

**방법 1: Cloudflare Pages에서 자동 생성 (권장)**
1. Cloudflare 대시보드 → Pages → 내 프로젝트 선택
2. 설정 → 도메인 → Search Engine Notifications (IndexNow)
3. 활성화하면 Cloudflare가 자동으로 키 관리

**방법 2: 수동 생성**
1. https://www.indexnow.org/howtoindex 접속
2. "Generate key" 클릭하여 키 생성
3. 생성된 키를 `키값.txt` 파일로 만들어 웹사이트 루트에 업로드
   - 예: `abc123.txt` 파일을 `https://your-site.com/abc123.txt`에 접근 가능하게
4. N-Side Pro 설정에 키 입력

### Google PageSpeed Insights API 키 (페이지 속도 측정)

> 💡 **없어도 됩니다!** 없으면 샘플 데이터를 보여줍니다.

1. https://console.cloud.google.com 접속
2. 새 프로젝트 만들기
3. API 및 서비스 → 라이브러리 → "PageSpeed Insights API" 검색 → 사용 설정
4. API 및 서비스 → 사용자 인증 정보 → API 키 만들기
5. N-Side Pro 설정에 입력

---

## 6. 기능별 사용 방법

### 글 생성 (Generate)

1. 왼쪽 메뉴 "글 생성" 클릭
2. 키워드 입력 (예: "다이어트 식단 완전 가이드")
3. 플랫폼 선택 (네이버 블로그/티스토리/워드프레스)
4. 우측 "설정" 패널에서 글자 수, 제목 개수 등 조정
5. "글 생성 시작" 버튼 클릭
6. AI가 실시간으로 글을 작성 (30초~2분 소요)
7. 완성된 글을 복사해서 블로그에 붙여넣기

> 💡 **팁:** 오른쪽 패널에서 "AEO 최적화"를 켜면 AI 검색에 더 잘 인용되는 글이 생성됩니다.

### 키워드 분석 (Keywords)

1. "키워드 분석" 메뉴 클릭
2. 분석할 키워드 입력 (예: "헬스 운동")
3. "분석 시작" 클릭
4. 결과 확인:
   - **월간 검색량**: 한 달에 몇 번 검색되는지
   - **경쟁도**: 같은 키워드로 쓴 글이 얼마나 많은지
   - **포화도**: 경쟁이 얼마나 치열한지 (낮을수록 좋음)
   - **난이도**: 상위 노출 얼마나 어려운지
5. "저장" 클릭하면 목록에 보관

> 💡 **실제 데이터를 보려면:** 네이버 검색광고 API 키가 필요합니다. 키 없이는 추정치가 표시됩니다.

### 발행 스케줄 (Schedule)

1. "발행 스케줄" 메뉴 클릭
2. "예약 추가" 버튼 클릭
3. 키워드/글 제목, 플랫폼, 날짜, 시간 입력
4. 예약 추가
5. 달력에서 예약 현황 확인

> ⚠️ **주의:** 현재 자동 발행 기능은 없습니다.  
> 예약 시간이 되면 히스토리 페이지에서 직접 글을 복사해 블로그에 발행해야 합니다.  
> 자동 발행 기능은 향후 추가 예정입니다.

### 히스토리 (History)

1. "히스토리" 메뉴 클릭
2. 생성된 모든 글 목록 확인
3. 글 제목 클릭 → 내용 미리보기
4. 상태 변경: 초안 → 발행됨
5. "CSV 내보내기": 엑셀로 목록 다운로드

### SEO 모니터 (Monitor)

**순위 추적 탭:**
1. "SEO 모니터" 메뉴 클릭
2. 추적할 키워드 입력 후 "추가" 클릭
3. "확인" 버튼 클릭해서 현재 순위 기록
4. 반복 클릭하면 순위 변화 추적

> ⚠️ **중요:** 네이버/구글은 직접 순위 조회 API를 제공하지 않습니다.  
> 현재는 검색 결과 수 기반으로 순위를 **추정**합니다. 실제 순위와 다를 수 있습니다.  
> 정확한 순위 확인은 네이버 서치어드바이저 또는 구글 서치 콘솔을 이용하세요.

**AEO 모니터 탭:**
1. "AEO 모니터" 탭 클릭
2. 확인할 글의 URL과 대상 키워드 입력
3. "AEO 점수 분석" 클릭
4. 점수와 개선 권고 확인

### 일괄 생성 (Batch)

1. "일괄 생성" 메뉴 클릭
2. 여러 키워드를 줄바꿈으로 입력
3. 예시:
   ```
   다이어트 식단 완전 가이드
   헬스 운동 루틴
   단백질 보충제 추천
   ```
4. "일괄 생성 시작" 클릭
5. **⚠️ 브라우저를 닫지 마세요!** 탭을 열어둔 상태에서만 작동합니다.

> ⚠️ **현재 제한:** Cloudflare Workers는 10분 이상 실행할 수 없어서,  
> 배치 처리가 길어지면 브라우저에서 직접 관리해야 합니다.

### 인덱싱 제출 (Indexing)

1. "인덱싱" 메뉴 클릭
2. 검색엔진에 알릴 URL들을 줄바꿈으로 입력
3. IndexNow API 키가 설정되어 있어야 함
4. "제출" 클릭 → Bing, Naver 등에 즉시 알림 전송

### 관리자: 회원 승인 (Admin)

관리자 계정으로 로그인한 경우만 표시됩니다.

1. 왼쪽 메뉴 하단 "👑 회원 관리" 클릭
2. 승인 대기 중인 회원 목록 확인
3. 각 회원의 "승인" 또는 "거부" 버튼 클릭
4. 승인된 회원만 서비스 이용 가능

---

## 7. 문제 해결 (오류가 났을 때)

### ❌ "Cannot find module" 오류

```
Error: Cannot find module 'hono'
```

**해결:** 패키지 재설치
```bash
npm install
```

### ❌ "wrangler: command not found" 오류

**해결:** npx 사용
```bash
npx wrangler --version
```

### ❌ "Database not found" 오류

**해결:** 마이그레이션 재실행
```bash
npx wrangler d1 migrations apply nside-pro-production --local
```

### ❌ 글 생성 시 "Gemini API 키가 필요합니다" 오류

**해결:** 설정 페이지에서 Gemini API 키 입력
1. 오른쪽 상단 설정 아이콘 클릭
2. "Google Gemini API Key" 입력란에 키 붙여넣기
3. 저장

### ❌ 로그인 후 "승인 대기 중" 메시지

**현상:** 회원가입 했는데 로그인이 안 됨

**이유:** N-Side Pro는 관리자 승인 후 이용 가능합니다.

**해결:**  
- 관리자에게 승인 요청
- 또는 직접 관리자로 로그인하여 회원 관리 페이지에서 승인

### ❌ 빌드 오류 (TypeScript 오류)

```
error TS2345: Argument of type...
```

**해결:**
```bash
# 타입 오류 무시하고 빌드
node build-worker.mjs
```

esbuild는 타입 오류가 있어도 빌드됩니다. Vite 빌드(`npm run build`)는 타입 검사를 하므로 오류가 있으면 실패합니다.

### ❌ Cloudflare 배포 시 "Authentication error"

**해결:**
```bash
npx wrangler logout
npx wrangler login
```

다시 로그인 후 배포 시도

### ❌ "KV namespace not found" 오류

**해결:** `wrangler.jsonc`에 KV ID가 올바르게 입력되었는지 확인
```bash
# KV 목록 확인
npx wrangler kv namespace list
```

---

## 8. 현재 구현 상태 & 추후 개발 예정

### ✅ 현재 완전히 작동하는 기능

| 기능 | 상세 |
|------|------|
| 로그인/회원가입 | JWT 세션, 관리자 승인 시스템 |
| 글 생성 | Gemini AI 스트리밍 생성, AEO 점수 측정 |
| 히스토리 | DB 저장/조회/삭제, CSV 내보내기, 상태 변경 |
| 대시보드 | 실제 DB 통계 (생성 글 수, 키워드 수, 평균 AEO) |
| 발행 스케줄 | DB 저장/조회/삭제, 달력 뷰 |
| 키워드 분석 | 네이버 검색광고 API 연동 (키 없으면 추정치) |
| SEO 모니터 | 키워드 추적 추가/삭제/순위 기록 |
| IndexNow | URL 즉시 제출 |
| JSON-LD 스키마 | 자동 생성 |
| PageSpeed | 분석 (키 없으면 샘플) |
| 관리자 | 회원 승인/거부/삭제/역할 변경 |

### 🟡 기본 작동하지만 제한 있는 기능

| 기능 | 제한 사항 |
|------|----------|
| 일괄 생성 | 브라우저 탭을 열어둔 상태에서만 실행됨 |
| 순위 추적 | 실제 순위 아닌 추정치 (크롤링 불가) |
| AEO 모니터 | 실제 AI 인용 여부 확인 불가, 로컬 점수만 |

### 🔴 아직 구현 안 된 기능 (향후 추가 예정)

| 기능 | 설명 | 구현 방법 (참고) |
|------|------|-----------------|
| 자동 블로그 발행 | 생성된 글을 블로그에 직접 포스팅 | 네이버 블로그 API, 티스토리 API, WordPress REST API |
| 콘텐츠 노후화 분석 | 트래픽 감소 자동 감지 | Google Analytics API 연동 |
| 실시간 배치 처리 | 브라우저 없이 서버에서 처리 | Cloudflare Queue 또는 Durable Objects 사용 |
| 네이버 DataLab 트렌드 | 실제 트렌드 데이터 | 네이버 DataLab API |
| Google Search Console | 검색 성능 데이터 | GSC API |
| Slack/카카오톡 알림 | 배치 완료, 순위 변화 알림 | Slack Webhook, 카카오 알림톡 |
| API 키 서버 저장 | 현재 브라우저에 저장 → 서버 저장 | Cloudflare KV + 암호화 |

### 보안 개선 필요 사항 (실제 운영 전 필수)

1. **API 키 서버 저장**: 현재 API 키가 브라우저(localStorage)에 저장됩니다.  
   같은 기기를 공유하면 노출 위험이 있습니다.  
   → Cloudflare KV에 암호화 저장으로 개선 필요

2. **JWT 서명**: 현재 JWT 토큰에 서명이 없습니다.  
   → `JWT_SECRET` 환경변수를 설정하고 서명 추가 필요  
   ```bash
   npx wrangler pages secret put JWT_SECRET --project-name nside-pro
   ```

3. **Rate Limiting**: API 호출 횟수 제한 없음  
   → Cloudflare WAF 또는 직접 구현 필요

---

## 자주 묻는 질문 (FAQ)

**Q: 무료로 쓸 수 있나요?**  
A: Cloudflare Pages는 무료 플랜으로 운영 가능합니다. Gemini API도 무료 티어(하루 50회)가 있습니다. 대량 사용 시 유료가 될 수 있습니다.

**Q: 몇 명까지 사용할 수 있나요?**  
A: 관리자가 승인한 인원 제한 없이 사용 가능합니다. Cloudflare 무료 플랜은 하루 요청 10만 건 제한이 있습니다.

**Q: 데이터는 어디에 저장되나요?**  
A: Cloudflare D1(글로벌 SQLite DB)에 저장됩니다. 한국 데이터는 가장 가까운 Cloudflare 엣지에 저장됩니다.

**Q: 생성된 글의 저작권은 누구에게 있나요?**  
A: AI로 생성된 글의 저작권은 복잡한 문제입니다. Gemini 약관을 확인하고, 생성된 글을 직접 편집하여 독창성을 높이는 것을 권장합니다.

**Q: 네이버 블로그에 자동으로 포스팅되나요?**  
A: 현재는 안 됩니다. 생성된 글을 수동으로 복사해서 블로그에 붙여넣기 해야 합니다. 자동 포스팅은 향후 추가 예정입니다.

---

*마지막 업데이트: 2026년 4월 6일*  
*GitHub: https://github.com/figh1015-prog/n-side-2026*
