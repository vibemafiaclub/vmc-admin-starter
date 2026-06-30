# CLAUDE.md — PG 가맹점 위험도 분석 시스템 (sample 브랜치)

> 이 파일은 Claude Code가 이 코드베이스를 이해하기 위한 컨텍스트입니다.

## 이 프로젝트란

PG사 컴플라이언스를 위한 가맹점 위험도 AI 분석 시스템.
`main` 브랜치(빈 캔버스 템플릿)에서 출발해 구현한 완성 예시입니다.

## 아키텍처 (3-tier)

```
Presentation   →  app/[page]/page.tsx         (Server 또는 Client Component)
Application    →  app/api/[route]/route.ts    (Next.js Route Handler)
Infrastructure →  lib/db.ts + schema.sql      (SQLite via better-sqlite3)
```

### 규칙

- `getDB()`는 `'use client'` 컴포넌트에서 절대 호출하지 않는다.
- DB 접근은 반드시 API route 또는 Server Component를 통한다.
- 타입은 `types/index.ts`에 단일 관리한다.
- 컴포넌트는 `components/ui/`에 범용적으로 유지한다.

## 핵심 파일 맵

```
schema.sql                    — DB 스키마 (merchants, analyses, guidelines)
lib/db.ts                     — SQLite 싱글톤 (getDB)
types/index.ts                — 전체 타입 정의
app/api/analyses/[id]/run/    — AI 분석 SSE 스트리밍 핵심 로직
app/guidelines/page.tsx       — AI 지침 관리 (프롬프트를 DB로 제어)
test-fixtures/                — 수동 테스트 입력값
```

## AI 분석 에이전트 패턴

```typescript
// app/api/analyses/[id]/run/route.ts 핵심 구조
const prompt = `...가맹점 정보 + DB에서 로드한 지침...`;
const claude = spawn('claude', ['-p', prompt]);
// stdout 누적 → JSON 파싱 → DB 저장 → SSE 'done' 이벤트
```

지침(guidelines 테이블)을 수정하면 코드 변경 없이 AI 행동이 바뀐다.
이것이 "DB로 프롬프트를 설정하는" 패턴의 핵심이다.

## 안티패턴 (하지 말 것)

- JSX 섹션 레이블 주석 (`{/* ─── 폼 영역 ─── */}`)
- 코드가 이미 설명하는 주석 (`// 버튼 클릭 핸들러`)
- `'use client'`에서 `getDB()` 직접 호출
- 타입 중복 정의 (같은 타입을 여러 파일에 선언)
