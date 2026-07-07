# vmc-admin-starter — Sample: PG 가맹점 위험도 분석 시스템

> **이 브랜치(`sample`)는 구현 예시입니다.**
> 빈 캔버스 템플릿은 [`main` 브랜치](https://github.com/vibemafiaclub/vmc-admin-starter)를 사용하세요.

---

## 무엇을 만들었나

PG사 컴플라이언스 팀이 신규 가맹점의 위험도를 AI로 분석하는 내부 도구.
영업 담당자가 가맹점 정보를 입력하면 Claude가 신원·업종·웹 평판을 다각도로 분석해 승인/거절/추가정보요청을 권고한다.

### 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 분석 현황 통계 |
| 신규 분석 | `/analyses/new` | 가맹점 정보 입력 폼 |
| 분석 내역 | `/analyses` | 전체 이력 테이블 |
| 분석 결과 | `/analyses/[id]` | 관점별 분석 결과 + 종합 보고서 |
| 세부 지침 | `/guidelines` | AI 분석 지침 편집 |

### AI 분석 흐름

```
가맹점 정보 입력
→ POST /api/analyses/[id]/run
→ DB에서 지침 로드 (없으면 기본값 사용)
→ claude -p 로 SSE 스트리밍 분석
→ 신원 확인 / 업종 위험도 / 웹 평판 3관점 분석
→ verdict(approved | rejected | need_info) + 보고서 저장
→ 결과 화면 표시
```

세부 지침 페이지에서 지침을 수정하면 다음 분석부터 AI 행동이 달라진다.

---

## 시작하기

> **Node.js 버전**: LTS(v22) 사용을 권장한다 (`.nvmrc` 참고). v20.19 이상 필요.

```bash
npm install
npm run dev   # http://localhost:3001
```

### `npm install`에서 better-sqlite3 빌드 오류가 날 때

`prebuild-install` 실패 후 C++ 컴파일러(Visual Studio Build Tools)가 없다는 오류가 보이면, 설치된 Node.js 버전에 맞는 사전 빌드 바이너리를 못 찾아 소스 빌드로 넘어간 경우다. 아래 순서로 해결한다.

1. Node.js 버전 확인: `node -v` — v20.19 미만이면 [nodejs.org](https://nodejs.org)에서 **v22 LTS** 설치
2. 의존성 재설치:
   ```bash
   rm -rf node_modules package-lock.json   # Windows PowerShell: rd /s /q node_modules; del package-lock.json
   npm install
   ```
3. 그래도 실패하면 오류 전문을 강사에게 전달

---

## 테스트 케이스

`test-fixtures/sample-merchant.md` — 저위험/고위험/경계선 3개 케이스 준비됨.

---

## 기술 스택

- **Next.js 16** App Router (React 19)
- **SQLite** (better-sqlite3) — 로컬 파일 DB, 별도 서버 불필요
- **Claude CLI** (`claude -p`) — AI 분석 에이전트
- **Tailwind CSS 4** — 모노크롬 디자인 시스템

---

## 이 구현에서 배우는 것

1. **DB 테이블 → API route → 페이지** 3-tier 흐름
2. **SSE 스트리밍** — `ReadableStream` + `fetch` + `EventSource` 패턴
3. **AI를 도구로 쓰기** — `claude -p`로 구조화된 JSON 출력 받기
4. **DB 기반 프롬프트 설정** — 지침을 DB에 저장해 코드 수정 없이 AI 행동 제어

---

## 직접 만들어보기

`main` 브랜치를 clone해서 이 구현을 처음부터 따라 만들 수 있다.

```bash
git clone https://github.com/vibemafiaclub/vmc-admin-starter.git
cd vmc-admin-starter
# main 브랜치 = 빈 캔버스 템플릿
```
