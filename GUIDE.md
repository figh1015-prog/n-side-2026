# 📘 N-Side Pro 초보자 가이드북

> **이 가이드는 코딩을 모르는 분도 따라할 수 있도록 작성되었습니다.**  
> 순서대로 차근차근 따라오시면 됩니다. 막히는 부분이 있으면 각 단계의 설명을 다시 읽어보세요.

---

## 📋 목차

1. [내 컴퓨터에 코드 받기 (GitHub 클론)](#1-내-컴퓨터에-코드-받기)
2. [Node.js 설치하기](#2-nodejs-설치하기)
3. [의존성 패키지 설치하기](#3-의존성-패키지-설치하기)
4. [Cloudflare 계정 만들기](#4-cloudflare-계정-만들기)
5. [D1 데이터베이스 만들기](#5-d1-데이터베이스-만들기)
6. [KV 저장소 만들기](#6-kv-저장소-만들기)
7. [wrangler.jsonc 수정하기](#7-wranglerjsonc-수정하기)
8. [내 컴퓨터에서 로컬 실행하기](#8-내-컴퓨터에서-로컬-실행하기)
9. [Cloudflare에 배포하기](#9-cloudflare에-배포하기)
10. [AI API 키 설정하기 (필수!)](#10-ai-api-키-설정하기)
11. [처음 사용 시 관리자 계정 만들기](#11-처음-사용-시-관리자-계정-만들기)
12. [자주 묻는 질문 (FAQ)](#12-자주-묻는-질문)

---

## 1. 내 컴퓨터에 코드 받기

### GitHub에서 코드 다운로드

1. **터미널(명령 프롬프트)을 엽니다**
   - Windows: `시작 버튼` → `cmd` 검색 → 실행
   - Mac: `Spotlight(⌘+Space)` → `Terminal` 검색 → 실행

2. **아래 명령어를 복사해서 붙여넣기 하세요**

```bash
git clone https://github.com/figh1015-prog/n-side-2026.git
cd n-side-2026
```

> 💡 **git이 없다고 나오면?**  
> https://git-scm.com/downloads 에서 Git을 먼저 설치하세요.

---

## 2. Node.js 설치하기

Node.js는 이 프로젝트를 실행하는 데 필요한 프로그램입니다.

1. https://nodejs.org 접속
2. **"LTS" 버전** 다운로드 (왼쪽 초록색 버튼)
3. 설치 파일 실행 → 다음 → 다음 → 설치 완료

4. **설치 확인** (터미널에서 아래 명령어 입력)
```bash
node --version
npm --version
```
> 버전 숫자가 나오면 성공입니다! (예: `v20.11.0`)

---

## 3. 의존성 패키지 설치하기

프로젝트 폴더 안에서 아래 명령어를 실행합니다.

```bash
npm install
```

> ⏳ 1~3분 정도 걸립니다. 기다려 주세요.  
> `node_modules` 폴더가 생기면 완료입니다.

---

## 4. Cloudflare 계정 만들기

Cloudflare는 이 사이트를 전 세계에 무료로 배포해주는 서비스입니다.

1. https://cloudflare.com 접속
2. 우측 상단 **"Sign Up"** 클릭
3. 이메일 / 비밀번호 입력 후 가입
4. 이메일 인증 완료

> 💡 개인용은 **무료 플랜**으로도 충분합니다.

---

## 5. D1 데이터베이스 만들기

D1은 Cloudflare가 제공하는 데이터베이스입니다. 회원 정보, 글 등이 여기에 저장됩니다.

### 5-1. Wrangler 로그인

터미널에서 아래 명령어를 실행합니다.

```bash
npx wrangler login
```

> 브라우저가 자동으로 열리면서 Cloudflare 로그인 화면이 나옵니다.  
> 로그인 후 **"Allow"** 버튼을 클릭하세요.

### 5-2. D1 데이터베이스 생성

```bash
npx wrangler d1 create nside-pro-production
```

실행하면 아래와 같은 결과가 나옵니다:

```
✅ Successfully created DB 'nside-pro-production'

[[d1_databases]]
binding = "DB"
database_name = "nside-pro-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← 이 ID를 복사하세요!
```

> ⚠️ **`database_id` 값을 꼭 복사해 두세요!** 다음 단계에서 사용합니다.

---

## 6. KV 저장소 만들기

KV는 로그인 세션(토큰)을 빠르게 저장하는 공간입니다.

```bash
npx wrangler kv namespace create CACHE
```

결과 예시:

```
✅ Successfully created namespace "CACHE"
id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"   ← 이 ID를 복사하세요!
```

> ⚠️ **`id` 값을 꼭 복사해 두세요!**

---

## 7. wrangler.jsonc 수정하기

이제 복사해둔 ID들을 설정 파일에 입력합니다.

### 7-1. 파일 열기

프로젝트 폴더에서 `wrangler.jsonc` 파일을 텍스트 편집기로 엽니다.
- Windows: 메모장, VSCode 등
- Mac: TextEdit, VSCode 등

> 💡 **VSCode 추천!** https://code.visualstudio.com 에서 무료로 다운로드

### 7-2. 수정할 내용

파일을 열면 아래와 같은 내용이 있습니다:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nside-pro-production",
    "database_id": "00000000-0000-0000-0000-000000000000"   ← 여기를 바꿔야 해요
  }
],

"kv_namespaces": [
  {
    "binding": "CACHE",
    "id": "00000000000000000000000000000000",              ← 여기를 바꿔야 해요
    "preview_id": "00000000000000000000000000000000"        ← 여기도 바꿔야 해요
  }
]
```

### 7-3. ID 교체하기

| 항목 | 어디서 복사한 값 |
|------|-----------------|
| `database_id` | 5단계에서 복사한 D1 ID |
| `id` (KV) | 6단계에서 복사한 KV ID |
| `preview_id` (KV) | 6단계에서 복사한 KV ID와 **동일하게** 입력 |

**수정 후 예시:**

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nside-pro-production",
    "database_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  ✅ 바뀐 값
  }
],

"kv_namespaces": [
  {
    "binding": "CACHE",
    "id": "abc123def456abc123def456abc123de",              ✅ 바뀐 값
    "preview_id": "abc123def456abc123def456abc123de"        ✅ 동일하게
  }
]
```

파일 저장 후 닫습니다.

---

## 8. 내 컴퓨터에서 로컬 실행하기

배포 전에 내 컴퓨터에서 먼저 테스트해봅니다.

### 8-1. 데이터베이스 초기화

```bash
npx wrangler d1 migrations apply nside-pro-production --local
```

> 테이블이 자동으로 생성됩니다.

### 8-2. 빌드하기

```bash
npx vite build
```

> ⏳ 1~2분 정도 걸립니다.

### 8-3. esbuild로 워커 빌드

```bash
npx esbuild src/index.tsx --bundle --outfile=dist/_worker.js --format=esm --platform=browser --target=es2022 --define:process.env.NODE_ENV='"production"' --conditions=worker,browser --main-fields=browser,module,main
```

### 8-4. 로컬 서버 실행

```bash
npx wrangler pages dev dist --d1=nside-pro-production --local --ip 0.0.0.0 --port 3000
```

### 8-5. 브라우저에서 확인

브라우저를 열고 아래 주소로 접속합니다:

```
http://localhost:3000
```

> 로그인 화면이 나오면 성공입니다! 🎉

---

## 9. Cloudflare에 배포하기

인터넷에서 누구나 접근할 수 있도록 배포합니다.

### 9-1. Pages 프로젝트 생성 (최초 1회)

```bash
npx wrangler pages project create nside-pro --production-branch main
```

### 9-2. 프로덕션 DB 마이그레이션

```bash
npx wrangler d1 migrations apply nside-pro-production
```

> ⚠️ `--local` 없이 실행해야 실제 Cloudflare DB에 적용됩니다.

### 9-3. 배포 실행

```bash
npx wrangler pages deploy dist --project-name nside-pro
```

> 완료되면 아래와 같은 주소가 나옵니다:
> ```
> ✅ Deployment complete!
> 🌎 https://nside-pro.pages.dev
> ```

### 9-4. 배포 결과 확인

위에서 나온 주소를 브라우저에서 열어보세요.  
로그인 화면이 나오면 배포 성공입니다!

---

## 10. AI API 키 설정하기

N-Side Pro는 글 생성에 **Gemini AI**를 사용합니다.  
API 키가 없으면 글 생성 기능을 사용할 수 없습니다.

### 10-1. Gemini API 키 발급 (무료)

1. https://aistudio.google.com 접속
2. Google 계정으로 로그인
3. 좌측 메뉴에서 **"Get API Key"** 클릭
4. **"Create API Key"** 클릭
5. 키가 생성되면 복사 (예: `AIza...`)

> 💡 무료 플랜으로도 충분히 사용할 수 있습니다.

### 10-2. 사이트에서 API 키 입력

1. N-Side Pro 사이트에서 로그인
2. 왼쪽 사이드바 → **"설정"** 클릭
3. **"API 키"** 탭 선택
4. **Gemini API 키** 칸에 복사한 키 붙여넣기
5. **"저장"** 버튼 클릭
6. **"테스트"** 버튼으로 정상 작동 확인

> ⚠️ API 키는 내 브라우저에만 저장됩니다. 다른 기기에서 로그인하면 다시 입력해야 합니다.

### 10-3. (선택) 네이버 API 키

키워드 분석 기능을 제대로 사용하려면 네이버 API 키도 필요합니다.

| 기능 | 필요한 키 | 발급 주소 |
|------|-----------|-----------|
| 키워드 검색량 조회 | 네이버 검색광고 API | https://searchad.naver.com |
| 블로그 검색 경쟁도 | 네이버 검색 API | https://developers.naver.com |

> 💡 네이버 키가 없어도 대략적인 모의 분석은 가능합니다.

---

## 11. 처음 사용 시 관리자 계정 만들기

### 관리자(Admin) 계정이란?

- 사이트를 관리하는 최고 권한 계정입니다.
- **첫 번째로 가입한 사람**이 자동으로 관리자가 됩니다.
- 관리자만 다른 사람의 가입 신청을 승인할 수 있습니다.

### 11-1. 첫 번째 계정 만들기

1. 사이트에 접속
2. 로그인 화면에서 **"가입 신청하기"** 클릭
3. 이름, 이메일, 비밀번호 입력
4. **"가입 신청하기"** 버튼 클릭

> ✅ **"관리자 계정이 생성되었습니다"** 메시지가 나오면 성공!  
> 바로 로그인 가능합니다.

### 11-2. 다른 사람이 가입 신청하면?

1. 사이드바 하단 **👑 "회원 관리"** 클릭
2. 승인 대기 중인 회원 목록 확인
3. **"승인"** 버튼 클릭 → 해당 회원 로그인 가능
4. **"거절"** 버튼 클릭 → 해당 회원 로그인 불가

> 💡 가입 신청 시 남긴 메시지를 확인해서 적합한 사람만 승인하세요.

---

## 12. 자주 묻는 질문

---

### ❓ "로그인이 안돼요"

**→ 관리자 승인을 받았는지 확인하세요.**

일반 회원은 관리자가 승인해야만 로그인할 수 있습니다.  
로그인 시 "계정 승인 대기 중입니다" 메시지가 나오면 관리자에게 승인 요청을 해야 합니다.

---

### ❓ "글 생성이 안 돼요 / 오류가 나요"

**→ Gemini API 키를 확인하세요.**

- 설정 → API 키 탭 → Gemini 키가 입력되어 있는지 확인
- "테스트" 버튼을 눌러 키가 유효한지 확인
- 키가 없으면 [10단계](#10-ai-api-키-설정하기)를 참고하세요.

---

### ❓ "배포했는데 사이트가 안 열려요"

**→ 몇 분 기다렸다가 다시 시도하세요.**

Cloudflare 배포는 전 세계 서버에 전파되는 데 최대 5분 정도 걸릴 수 있습니다.

---

### ❓ "wrangler.jsonc를 수정했는데 저장이 안 돼요"

**→ 파일 형식을 확인하세요.**

- 메모장에서 저장할 때 "모든 파일" 형식으로 저장하고
- 파일명을 `wrangler.jsonc`로 정확히 입력하세요.
- VSCode 사용을 강력 추천합니다.

---

### ❓ "터미널에서 명령어를 입력했는데 아무것도 안 나와요"

**→ 프로젝트 폴더 안에 있는지 확인하세요.**

터미널에서 아래 명령어로 폴더 위치를 이동하세요:

```bash
cd n-side-2026
```

`ls` (Mac) 또는 `dir` (Windows) 명령어로 파일 목록이 보이면 올바른 위치입니다.

---

### ❓ "API 키를 다른 기기에서 또 입력해야 하나요?"

**→ 네, 현재는 브라우저 저장 방식입니다.**

API 키는 보안을 위해 내 브라우저(localStorage)에만 저장됩니다.  
새 기기나 새 브라우저에서 로그인하면 설정 페이지에서 다시 입력해야 합니다.

---

### ❓ "데이터가 사라졌어요"

**→ 로컬 실행 중이라면 정상입니다.**

로컬(`localhost`) 실행 시 데이터는 내 컴퓨터에 임시 저장됩니다.  
실제 서비스는 Cloudflare에 배포한 버전을 사용하세요. 배포 버전의 데이터는 영구 저장됩니다.

---

## 🔑 정리: 꼭 해야 할 것 체크리스트

```
□ Node.js 설치 완료
□ npm install 실행 완료
□ Cloudflare 계정 생성
□ npx wrangler login 완료
□ D1 데이터베이스 생성 → database_id 복사
□ KV 저장소 생성 → id 복사
□ wrangler.jsonc 에 ID 두 개 입력 완료
□ 로컬 실행 테스트 완료 (localhost:3000 확인)
□ Cloudflare 배포 완료
□ 첫 번째 회원가입 → 관리자 계정 생성
□ 설정 → Gemini API 키 입력
```

---

## 📞 도움이 필요하다면

- **Cloudflare 공식 문서**: https://developers.cloudflare.com
- **Gemini API**: https://aistudio.google.com
- **GitHub 저장소**: https://github.com/figh1015-prog/n-side-2026

---

> 📌 **중요**: `wrangler.jsonc`에 입력하는 ID 값들은 외부에 공개하지 마세요.  
> GitHub에 올릴 때는 `.gitignore`에 의해 자동으로 제외됩니다.  
> (이미 설정되어 있으니 걱정하지 않아도 됩니다!)
