# VMC Admin — 구현 Spec

> 목적: 교육 시연용 비즈니스 어드민. VMC의 실제 운영 데이터를 로컬에서만 구동.
> 이 문서는 Wave/Node 병렬 구현 시 유일한 소통 채널이다. 모든 인터페이스는 여기서 확정된다.

## 환경

- **런타임**: Next.js 16.2.2, React 19, TypeScript 5
- **DB**: SQLite (`better-sqlite3`), 파일 위치: `data/admin.db`
- **스타일**: Tailwind CSS 4 (CSS 변수 기반, tailwind.config.ts 없음)
- **포트**: 3001
- **AI**: `claude -p <prompt>` (로컬 인증된 Claude Code CLI)
- **패키지 매니저**: pnpm

---

## 디렉토리 구조 (소유권 명시)

```
apps/admin/
├── app/
│   ├── layout.tsx              ← 1C 소유 (nav 포함, 다른 노드 수정 금지)
│   ├── globals.css             ← Pre-wave 생성 완료 (수정 시 1C만)
│   ├── page.tsx                ← 3A 소유
│   ├── board/page.tsx          ← 3B 소유
│   ├── calendar/page.tsx       ← 3C 소유
│   ├── generate/page.tsx       ← 4A 소유
│   └── api/
│       ├── settings/masking/route.ts   ← 1B 소유
│       ├── inquiries/route.ts          ← 2B 소유
│       ├── projects/route.ts           ← 2B 소유
│       ├── events/route.ts             ← 2B 소유
│       ├── dashboard/route.ts          ← 2B 소유
│       └── ai/generate/route.ts        ← 4A 소유
├── components/ui/
│   ├── Button.tsx      ← 1C 소유
│   ├── Badge.tsx       ← 1C 소유
│   ├── Card.tsx        ← 1C 소유
│   └── MaskToggle.tsx  ← 1C 소유
├── lib/
│   ├── db.ts           ← 1A 소유
│   └── mask.ts         ← 1B 소유
├── types/
│   └── index.ts        ← 1B 소유
├── scripts/
│   └── ingest.ts       ← 2A 소유
├── data/               ← gitignored, DB 파일 위치
├── schema.sql          ← 1A 소유
├── CLAUDE.md
├── SPEC.md
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

---

## SQLite 스키마 (`schema.sql` — 1A가 파일 작성, `lib/db.ts`에서 초기화)

```sql
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  status TEXT NOT NULL DEFAULT 'received',
  received_at TEXT,
  estimated_value INTEGER NOT NULL DEFAULT 0,
  assignee TEXT NOT NULL DEFAULT 'choesumin',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  revenue INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '기타',
  date TEXT NOT NULL,
  time TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  inquiry_id TEXT REFERENCES inquiries(id),
  project_id TEXT REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  inquiry_id TEXT REFERENCES inquiries(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('masking_enabled', 'true');
```

---

## TypeScript 인터페이스 (`types/index.ts` — 1B 소유)

```typescript
export type InquiryStatus = 'received' | 'in_progress' | 'completed' | 'closed';
export type ProjectStatus = 'active' | 'archived';
export type EventType = '교육' | '미팅' | '콜' | '기타';
export type DocumentType = '이메일' | '제안서' | 'PRD' | '슬라이드';
export type MaskType = 'company' | 'name' | 'email' | 'phone' | 'location';

export interface Inquiry {
  id: string;
  company: string;
  category: string;
  status: InquiryStatus;
  received_at: string | null;
  estimated_value: number;
  assignee: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  revenue: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  type: EventType;
  date: string;
  time: string | null;
  duration_minutes: number;
  location: string | null;
  inquiry_id: string | null;
  project_id: string | null;
}

export interface Document {
  id: number;
  title: string;
  type: DocumentType;
  content: string | null;
  created_at: string;
  inquiry_id: string | null;
}

export interface Settings {
  masking_enabled: boolean;
}

export interface DashboardStats {
  active_inquiries: number;
  pipeline_total: number;
  active_projects: number;
  upcoming_events: number;
}
```

---

## `lib/db.ts` Export 시그니처 (1A 구현, 1B가 import해서 사용)

```typescript
import Database from 'better-sqlite3';

// 싱글톤 패턴. 앱 내 유일한 DB 접근 지점.
export function getDB(): Database.Database

// 앱 시작 시 schema.sql 실행하여 테이블 초기화
// 내부에서 getDB() 후 schema.sql 파일 읽어 execSync 실행
```

- DB 파일 경로: `path.join(process.cwd(), 'data/admin.db')`
- schema.sql 경로: `path.join(process.cwd(), 'schema.sql')`
- `data/` 디렉토리가 없으면 자동 생성

---

## `lib/mask.ts` Export 시그니처 + 규칙 (1B 구현)

```typescript
// 마스킹 활성화 여부와 무관하게 항상 동일한 API
export function maskValue(value: string | null, type: MaskType, enabled: boolean): string | null

// inquiry ID → 일관된 익명 회사명 (A-Z 순환)
export function maskCompany(id: string, company: string, enabled: boolean): string
```

**마스킹 규칙:**

| type | enabled=true 출력 | 예시 |
|------|------------------|------|
| company | "고객사 A" ~ "고객사 Z" (id 해시 기반, 동일 id는 항상 동일 문자) | "고객사 C" |
| name | "담당자" | "담당자" |
| email | "\*\*\*@\*\*\*.\*\*\*" | "\*\*\*@\*\*\*.\*\*\*" |
| phone | "010-\*\*\*\*-\*\*\*\*" | "010-\*\*\*\*-\*\*\*\*" |
| location | 원본 그대로 (위치는 마스킹 불필요) | — |

`maskCompany` ID → 문자 매핑: `charCodeAt(0) + charCodeAt(last) % 26` → 'A' + offset

---

## API 계약

### `GET /api/settings/masking`
```json
// Response
{ "masking_enabled": true }
```

### `PATCH /api/settings/masking`
```json
// Request body
{ "masking_enabled": false }
// Response
{ "masking_enabled": false }
```

### `GET /api/inquiries?status=&category=`
```json
// Response: Inquiry[] (마스킹 적용됨)
[{
  "id": "014",
  "company": "고객사 C",       // masked
  "category": "B2B교육",
  "status": "in_progress",
  "received_at": "2026-04-27",
  "estimated_value": 6000000,
  "assignee": "choesumin",
  "contact_name": "담당자",     // masked
  "contact_email": "***@***.***", // masked
  "contact_phone": "010-****-****", // masked
  "notes": null
}]
```

### `PATCH /api/inquiries/[id]`
```json
// Request body
{ "status": "completed" }
// Response: 업데이트된 Inquiry (마스킹 적용)
```

### `GET /api/projects`
```json
// Response: Project[]
```

### `GET /api/events?month=2026-07`
```json
// Response: CalendarEvent[] (해당 월의 이벤트, 마스킹 적용)
```

### `GET /api/dashboard`
```json
// Response: DashboardStats + 최근 5개 inquiry (마스킹 적용)
{
  "stats": { "active_inquiries": 12, "pipeline_total": 85000000, "active_projects": 7, "upcoming_events": 3 },
  "recent_inquiries": [...]
}
```

### `GET /api/dashboard`
```json
// Response
{
  "stats": {
    "active_inquiries": 12,
    "pipeline_total": 85000000,
    "active_projects": 7,
    "upcoming_events": 3
  },
  "recent_inquiries": []  // 최근 5개 Inquiry (마스킹 적용)
}
```

### `POST /api/ai/generate` (SSE)
```json
// Request body
{
  "inquiry_id": "014",    // optional
  "type": "이메일",        // DocumentType
  "context": "..."        // optional 추가 컨텍스트
}
// Response: text/event-stream
// 각 청크: data: {"chunk": "..."}\n\n
// 완료:    data: {"done": true, "content": "전체 결과"}\n\n
// 에러:    data: {"error": "메시지"}\n\n
```

---

## 디자인 토큰 (Tailwind 4 CSS 변수)

### 상태 색상 (Badge에 사용)
```
received:    bg-gray-100 text-gray-700
in_progress: bg-blue-100 text-blue-700
completed:   bg-green-100 text-green-700
closed:      bg-slate-100 text-slate-600
```

### 이벤트 타입 색상 (Calendar에 사용)
```
교육: bg-blue-500
미팅: bg-green-500
콜:  bg-yellow-400
기타: bg-gray-400
```

### 카테고리 Badge 색상
```
B2B교육:        bg-purple-100 text-purple-700
AX컨설팅:       bg-orange-100 text-orange-700
강연의뢰:       bg-teal-100 text-teal-700
브랜디드콘텐츠협업: bg-pink-100 text-pink-700
기타:           bg-gray-100 text-gray-600
```

### 기본 팔레트
- Primary: `indigo-600` / hover `indigo-700`
- Sidebar bg: `slate-900`, text: `slate-300`, active: `white`
- Page bg: `slate-50`
- Card bg: `white`, border: `slate-200`

---

## 컴포넌트 API (1C 구현)

### `Button`
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### `Badge`
```typescript
interface BadgeProps {
  label: string;
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'teal' | 'pink' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
}
```

### `Card`
```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
```

### `MaskToggle`
```typescript
// 자체적으로 /api/settings/masking GET/PATCH 호출
// 전역 마스킹 상태를 UI에서 토글
// props 없음 — 서버 설정값 직접 읽고 씀
// "use client" 필요
interface MaskToggleProps {}
```

---

## 레이아웃 구조 (`app/layout.tsx` — 1C 소유)

```
┌─────────────────────────────────────────┐
│  Sidebar (w-56, slate-900)              │
│  ┌─────────────────────────────────────┐│
│  │ VMC Admin  [🔒 마스킹 ON]           ││  ← MaskToggle
│  │─────────────────────────────────────││
│  │ 대시보드    /                        ││
│  │ 협업 보드   /board                   ││
│  │ 캘린더      /calendar                ││
│  │ AI 문서 생성 /generate               ││
│  └─────────────────────────────────────┘│
│  Main Content (flex-1, slate-50)        │
└─────────────────────────────────────────┘
```

- Sidebar는 고정(fixed 또는 sticky), 스크롤은 main content만
- MaskToggle: 사이드바 상단. 아이콘(🔒/🔓) + "마스킹 ON/OFF" 텍스트
- 현재 페이지 nav 항목은 `bg-slate-700 text-white` 하이라이트

---

## Ingest 스크립트 규칙 (`scripts/ingest.ts` — 2A 소유)

**소스 경로** (스크립트 내 상수로 선언):
```typescript
const HUB_ROOT = path.join(process.cwd(), '../..')
// inquiries: HUB_ROOT/logs/inquiries/*/README.md
// projects:  HUB_ROOT/projects/*/AGENTS.md (또는 README.md)
```

**Inquiry 파싱:**
- `gray-matter`로 frontmatter 파싱
- 필드 매핑:
  ```
  inquiry_id → id
  company    → company
  category   → category (기본값: '기타')
  inquiry_status → status (매핑: draft→received, in_progress→in_progress, completed→completed, closed→closed)
  received_at → received_at
  ```
- `estimated_value` 추출: 본문에서 `/([0-9,]+)만원/g` 첫 번째 매치 × 10000
- 없으면 0

**Event 추출 (Inquiry별):**
- README.md 파일명 목록 (glob)에서 `(\d{6})_MEETING_`, `(\d{6})_DISCOVERY_` 패턴 탐지
- date: `YYMMDD` → `20YY-MM-DD`
- type: `MEETING` → '미팅', `DISCOVERY` → '미팅', `CALL` → '콜', `EDUCATION`/교육 → '교육'
- title: `[회사명] {슬러그}` (마스킹 미적용, 원본 저장)
- 본문에서 날짜+시간 패턴 `14:00~17:00` 탐지 시 time 필드 파싱

**Project 파싱:**
- `projects/` 하위 디렉토리명 → id
- AGENTS.md 첫 번째 `#` heading → name
- 첫 단락 → description (100자 truncate)
- status: 기본 'active'

**실행 방식:** upsert (INSERT OR REPLACE)

---

## AI 생성 프로토콜 (`app/api/ai/generate/route.ts` — 4A 소유)

```typescript
import { spawn } from 'child_process';

// claude -p 호출
const proc = spawn('claude', ['-p', prompt], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

// stdout → SSE chunk 전송
// stderr → 무시 (claude의 상태 메시지)
// close → done 이벤트 전송
```

**프롬프트 구조:**
```
시스템 컨텍스트: VMC(바이브마피아클럽) 비즈니스 어드민에서 사용하는 문서 생성기입니다.
문서 유형: {type}
{inquiry 정보 있으면: 회사: {company(마스킹 적용)}, 카테고리: {category}, 상태: {status}}
{context 있으면 추가}
위 정보를 바탕으로 {type} 문서를 작성해주세요.
슬라이드 타입인 경우: React JSX + Tailwind 클래스만 사용한 슬라이드 컴포넌트를 반환하세요.
```

## 마스킹 토글 동작 방식

`MaskToggle`이 `PATCH /api/settings/masking`으로 설정 변경 후 `window.location.reload()` 호출.
- 서버 사이드에서 masking_enabled를 읽어 API 응답에 마스킹 적용
- 클라이언트는 설정 변경 후 페이지 전체 리로드로 최신 마스킹 상태 반영
- 빠른 구현 우선 (데모용이므로 reload 방식 허용)

**JSX 프리뷰 (`app/generate/page.tsx`):**
- 생성된 JSX 코드블록 추출 → `dangerouslySetInnerHTML` 또는 `<iframe srcDoc>` 방식으로 프리뷰
- 단순성 우선: `<iframe srcDoc>` + 인라인 Tailwind CDN으로 렌더

---

## Wave별 완료 기준

### Validator 1 체크리스트
- [ ] `pnpm dev` 실행 시 컴파일 에러 없음
- [ ] `GET /api/settings/masking` → `{"masking_enabled":true}` 반환
- [ ] `PATCH /api/settings/masking` → 값 변경 및 반환 확인
- [ ] `lib/mask.ts` 단위: `maskValue("test@test.com", "email", true)` → `"***@***.***"`
- [ ] `lib/mask.ts` 단위: `maskCompany("001", "퓨처테크 주식회사", true)` → `"고객사 X"` (임의 문자, 단 일관성)
- [ ] `components/ui/` 4개 파일 존재
- [ ] `app/layout.tsx` 4개 nav 링크 포함

### Validator 2 체크리스트
- [ ] `pnpm run ingest` 실행 후 `data/admin.db` 생성됨
- [ ] `inquiry` 테이블에 행 존재 (최소 10개)
- [ ] `project` 테이블에 행 존재 (최소 5개)
- [ ] `GET /api/inquiries` → 배열 반환, `masking_enabled=true` 시 company가 "고객사 X" 형태
- [ ] `GET /api/events?month=2026-07` → 7/1, 7/8 퓨처테크 교육 이벤트 포함
- [ ] `GET /api/dashboard` → stats 4개 필드 포함

### Validator 3 체크리스트
- [ ] `/` (대시보드): KPI 카드 4개 렌더 확인, 데이터 로드됨
- [ ] `/board`: 칸반/테이블/카드 뷰 전환 동작
- [ ] `/board` 칸반: inquiry 카드가 상태 컬럼에 정렬됨
- [ ] `/calendar`: 7월 달력에 이벤트 표시됨
- [ ] 마스킹 토글 ON→OFF→ON 시 데이터 변경됨 (MaskToggle 동작)

### Validator 4 체크리스트
- [ ] `/generate`: 문서 유형 선택 UI 존재
- [ ] inquiry 선택 → "AI 생성" 버튼 클릭 → 스트리밍 텍스트 출력
- [ ] 슬라이드 타입 선택 시 JSX 프리뷰 iframe 렌더됨
- [ ] 생성된 문서가 `documents` 테이블에 저장됨
