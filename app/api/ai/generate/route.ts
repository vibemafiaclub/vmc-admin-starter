import { spawn } from 'child_process';
import { getDB } from '@/lib/db';
import { maskCompany } from '@/lib/mask';
import type { DocumentType, Inquiry } from '@/types/index';

interface GenerateBody {
  inquiry_id?: string;
  type: DocumentType;
  context?: string;
}

function getMaskEnabled(): boolean {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM settings WHERE key='masking_enabled'")
    .get() as { value: string } | undefined;
  return row?.value === 'true';
}

function buildPrompt(
  type: DocumentType,
  inquiry: Inquiry | null,
  company: string | null,
  context: string | undefined,
): string {
  const inquiryLine = inquiry
    ? `고객사: ${company}, 카테고리: ${inquiry.category}, 상태: ${inquiry.status}`
    : '';
  const contextLine = context ? `추가 컨텍스트: ${context}` : '';
  const slideLine =
    type === '슬라이드'
      ? 'React JSX + Tailwind CSS 클래스만 사용한 슬라이드 컴포넌트를 반환하세요. export default function Slide() { return (<div>...</div>) } 형태로.'
      : '';

  return `당신은 VMC(바이브마피아클럽) 비즈니스 어드민 문서 생성 AI입니다.
문서 유형: ${type}
${inquiryLine}
${contextLine}

위 정보를 바탕으로 ${type} 문서를 작성해주세요.
${slideLine}
간결하고 실용적으로 작성해주세요.`;
}

export async function POST(request: Request) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return new Response(JSON.stringify({ error: '잘못된 요청 본문입니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { inquiry_id, type, context } = body;

  if (!type) {
    return new Response(JSON.stringify({ error: '문서 유형(type)이 필요합니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Read masking_enabled from settings
  const maskEnabled = getMaskEnabled();

  // 2. If inquiry_id provided: fetch inquiry from DB, apply masking to company
  let inquiry: Inquiry | null = null;
  let company: string | null = null;
  if (inquiry_id) {
    const db = getDB();
    inquiry =
      (db.prepare('SELECT * FROM inquiries WHERE id = ?').get(inquiry_id) as Inquiry | undefined) ??
      null;
    if (inquiry) {
      company = maskCompany(inquiry.id, inquiry.company, maskEnabled);
    }
  }

  // 3. Build prompt
  const prompt = buildPrompt(type, inquiry, company, context);

  // 4. Return SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn('claude', ['-p', prompt], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let fullContent = '';

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        fullContent += text;
        controller.enqueue(
          encoder.encode('data: ' + JSON.stringify({ chunk: text }) + '\n\n'),
        );
      });

      proc.on('close', () => {
        try {
          // Save to documents table
          const db = getDB();
          db.prepare(
            'INSERT INTO documents (title, type, content, inquiry_id) VALUES (?, ?, ?, ?)',
          ).run(
            type + ' - ' + new Date().toISOString().slice(0, 10),
            type,
            fullContent,
            inquiry_id || null,
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              'data: ' + JSON.stringify({ error: String(err) }) + '\n\n',
            ),
          );
        }
        controller.enqueue(
          encoder.encode(
            'data: ' + JSON.stringify({ done: true, content: fullContent }) + '\n\n',
          ),
        );
        controller.close();
      });

      proc.on('error', (err) => {
        controller.enqueue(
          encoder.encode('data: ' + JSON.stringify({ error: err.message }) + '\n\n'),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
