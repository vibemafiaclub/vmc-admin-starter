# VMC Admin Starter

AI 기반 비즈니스 어드민 실습 프로젝트.  
Next.js + SQLite + Claude CLI로 구성된 로컬 전용 어드민 대시보드입니다.

## 주요 기능

- **대시보드** — 문의·파이프라인·프로젝트·일정 KPI 한눈에
- **협업 보드** — 칸반/테이블/카드 뷰, 드래그앤드롭 상태 변경
- **캘린더** — 월별 일정 관리
- **AI 문서 생성** — Claude CLI로 이메일·제안서·PRD·슬라이드 스트리밍 생성
- **수신 메일함** — AI 답신 초안 작성 → 피드백 → 발신 승인 플로우
- **마스킹 토글** — 민감 정보 마스킹 ON/OFF (데모용)

## 기술 스택

| 항목 | 버전 |
|------|------|
| Next.js (App Router) | 16.2.2 |
| React | 19.2.4 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| SQLite (better-sqlite3) | 11 |
| Claude CLI | 최신 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 데모 데이터 시드

```bash
npm run seed
```

`data/admin.db`에 샘플 문의·프로젝트·이벤트·이메일 데이터가 생성됩니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3001 접속

### AI 기능 사용 (선택)

문서 생성 및 메일 초안 기능은 Claude CLI가 필요합니다.

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

## 아키텍처

3-tier 레이어드 아키텍처를 따릅니다.

```
Presentation   →  app/*/page.tsx, components/
Application    →  app/api/*/route.ts
Infrastructure →  lib/, scripts/
```

- **Presentation → Application**: fetch()로만 호출, lib/ 직접 import 금지
- **Application → Infrastructure**: 직접 import 허용
- **마스킹**: API 레이어에서만 적용, 클라이언트 재마스킹 금지

자세한 스펙은 `SPEC.md` 참조.

## 디렉토리 구조

```
├── app/
│   ├── layout.tsx          # 사이드바 레이아웃
│   ├── page.tsx            # 대시보드
│   ├── board/page.tsx      # 협업 보드
│   ├── calendar/page.tsx   # 캘린더
│   ├── generate/page.tsx   # AI 문서 생성
│   ├── inbox/page.tsx      # 수신 메일함
│   └── api/                # API 라우트
├── components/ui/          # 공통 UI 컴포넌트
├── lib/
│   ├── db.ts               # SQLite 싱글톤
│   └── mask.ts             # 마스킹 유틸
├── scripts/
│   └── ingest.ts           # 데모 데이터 시드
├── types/index.ts          # 공통 타입 정의
└── schema.sql              # DB 스키마
```
