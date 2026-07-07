import { spawn } from 'child_process';
import { getDB } from '@/lib/db';
import { computeVerdict } from '@/lib/risk';
import type {
  AnalysisRunResult,
  PerspectiveKey,
  PerspectiveResult,
  RiskLevel,
} from '@/types';

type PerspectiveDef = { key: PerspectiveKey; title: string };

const PERSPECTIVES: PerspectiveDef[] = [
  { key: 'identity', title: '신원 확인' },
  { key: 'industry', title: '업종 위험도' },
  { key: 'reputation', title: '평판 분석' },
  { key: 'documents', title: '서류 검토' },
];

const DEFAULT_GUIDELINES: Record<string, string> = {
  identity:
    '사업자등록번호, 대표자명, 법인 설립 이력 등 신원 정보의 유효성과 일관성을 확인하라. 입력 정보와 제출 서류 간 불일치, 허위 정보, 명의 도용 의심 등 이상 징후가 있는지 판단하라.',
  industry:
    '해당 업종의 일반적인 위험도를 평가하라. 도박·성인·대부·가상자산·다단계 등 고위험 또는 금칙 업종 여부를 반드시 확인하고, 중간 위험 업종은 분쟁·환불·과장광고 가능성을 함께 살펴라.',
  reputation:
    '상호명과 사업자 정보를 기반으로 부정적 평판, 민원, 사기 이력, 소비자 분쟁 정황을 평가하라. 실시간 외부 조회가 아닌 학습된 지식 범위의 추정이며, 근거가 약하면 단정하지 말고 보수적으로 판단하라.',
  documents:
    '제출 서류가 입력된 가맹점 정보와 일치하는지 대조하라. 필수 서류 누락, 정보 불일치, 정산 구조의 불투명성이 있는지 확인하라.',
  judgment:
    '네 관점의 분석을 종합해 심사 소견을 서술하라. 최고 위험도가 high이면 거절, medium이면 추가정보필요, 모두 low일 때만 승인이 타당하다. 실패하거나 누락된 관점이 있으면 절대 승인으로 보지 말고 보수적으로 판단하라.',
};

const SYNTHESIS_FALLBACK =
  '종합 판정 에이전트를 실행하지 못해 자동 보고서를 생성하지 못했습니다. 각 관점별 분석 결과를 직접 확인하세요.';

type MerchantRow = {
  status: string;
  name: string;
  business_number: string;
  representative: string | null;
  category: string;
  address: string | null;
  submitted_docs: string | null;
};

type ClaudeResult = { ok: true; output: string } | { ok: false; enoent: boolean };

function runClaude(prompt: string): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let output = '';
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      resolve({ ok: false, enoent: true });
      return;
    }
    child.stdin?.end();
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, enoent: err.code === 'ENOENT' });
    });
    child.on('close', () => {
      if (settled) return;
      settled = true;
      resolve({ ok: true, output });
    });
  });
}

function buildPerspectivePrompt(
  def: PerspectiveDef,
  merchant: MerchantRow,
  guideline: string,
): string {
  return `당신은 PG사 컴플라이언스 심사 에이전트입니다. 아래 가맹점을 오직 '${def.title}' 관점에서만 분석하고 위험도를 평가하세요.

## 가맹점 정보
- 상호명: ${merchant.name}
- 사업자등록번호: ${merchant.business_number}
- 대표자: ${merchant.representative ?? '미제공'}
- 업종: ${merchant.category}
- 주소: ${merchant.address ?? '미제공'}
- 제출 서류 및 정보: ${merchant.submitted_docs ?? '없음'}

## '${def.title}' 관점 분석 지침
${guideline}

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.
{
  "findings": "이 관점에서 확인한 내용과 판단 근거를 한국어로 상세히 작성",
  "risk_level": "low"
}

risk_level 값은 반드시 low, medium, high 중 하나입니다.`;
}

function buildSynthesisPrompt(
  merchant: MerchantRow,
  results: PerspectiveResult[],
  guideline: string,
): string {
  const lines = results
    .map((r) =>
      r.status === 'completed'
        ? `[${r.title}] 위험도 ${r.risk_level} — ${r.findings}`
        : `[${r.title}] 분석불가 — ${r.findings}`,
    )
    .join('\n');

  return `당신은 PG사 컴플라이언스 종합 판정 에이전트입니다. 아래 4개 관점의 분석 결과를 종합해 심사 소견 보고서를 작성하세요. 등급과 권고는 시스템이 규칙으로 별도 계산하므로 보고서 본문만 작성합니다.

## 가맹점 정보
- 상호명: ${merchant.name}
- 업종: ${merchant.category}

## 관점별 분석 결과
${lines}

## 종합 판정 지침
${guideline}

위 내용을 종합해 심사 소견을 2~4문장의 한국어 서술형 보고서로 작성하세요. JSON이나 목록 없이 보고서 본문만 출력하세요.`;
}

function parsePerspective(output: string): { findings: string; risk_level: RiskLevel } | null {
  const match = output.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { findings?: unknown; risk_level?: unknown };
    const level = obj.risk_level;
    if (
      typeof obj.findings !== 'string' ||
      !obj.findings.trim() ||
      (level !== 'low' && level !== 'medium' && level !== 'high')
    ) {
      return null;
    }
    return { findings: obj.findings.trim(), risk_level: level };
  } catch {
    return null;
  }
}

function extractReport(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]) as { report?: unknown };
      if (typeof obj.report === 'string' && obj.report.trim()) return obj.report.trim();
    } catch {
      // JSON이 아니면 서술 텍스트로 간주하고 그대로 사용
    }
  }
  return trimmed;
}

function failedPerspective(def: PerspectiveDef, reason: string): PerspectiveResult {
  return { key: def.key, title: def.title, findings: reason, risk_level: 'medium', status: 'failed' };
}

async function analyzePerspective(
  def: PerspectiveDef,
  merchant: MerchantRow,
  guideline: string,
): Promise<{ result: PerspectiveResult; enoent: boolean }> {
  const res = await runClaude(buildPerspectivePrompt(def, merchant, guideline));
  if (!res.ok) {
    return { result: failedPerspective(def, '분석 에이전트 실행에 실패했습니다.'), enoent: res.enoent };
  }
  const parsed = parsePerspective(res.output);
  if (!parsed) {
    return { result: failedPerspective(def, '분석 결과를 해석하지 못했습니다.'), enoent: false };
  }
  return {
    result: {
      key: def.key,
      title: def.title,
      findings: parsed.findings,
      risk_level: parsed.risk_level,
      status: 'completed',
    },
    enoent: false,
  };
}

async function runSynthesis(
  merchant: MerchantRow,
  results: PerspectiveResult[],
  guideline: string,
): Promise<string> {
  const res = await runClaude(buildSynthesisPrompt(merchant, results, guideline));
  if (!res.ok) return SYNTHESIS_FALLBACK;
  return extractReport(res.output) || SYNTHESIS_FALLBACK;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysisId = parseInt(id, 10);
  const db = getDB();

  const analysis = db
    .prepare(
      `SELECT a.status, m.name, m.business_number, m.representative, m.category, m.address, m.submitted_docs
       FROM analyses a JOIN merchants m ON m.id = a.merchant_id
       WHERE a.id = ?`,
    )
    .get(analysisId) as MerchantRow | undefined;

  if (!analysis) return new Response('Not found', { status: 404 });
  if (analysis.status !== 'pending' && analysis.status !== 'failed') {
    return new Response('이미 실행 중이거나 완료된 분석입니다.', { status: 400 });
  }

  const guidelineRows = db
    .prepare('SELECT key, content FROM guidelines')
    .all() as { key: string; content: string }[];
  const guidelineMap = Object.fromEntries(guidelineRows.map((g) => [g.key, g.content]));
  const guidelineFor = (key: string) => guidelineMap[key] ?? DEFAULT_GUIDELINES[key];

  db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('running', analysisId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      try {
        const outcomes = await Promise.all(
          PERSPECTIVES.map((def) => {
            send('perspective_start', { key: def.key, title: def.title });
            return analyzePerspective(def, analysis, guidelineFor(def.key)).then((outcome) => {
              send('perspective_done', {
                key: outcome.result.key,
                title: outcome.result.title,
                risk_level: outcome.result.risk_level,
                status: outcome.result.status,
              });
              return outcome;
            });
          }),
        );

        const results = outcomes.map((o) => o.result);
        const failedCount = results.filter((r) => r.status === 'failed').length;

        if (failedCount === 4) {
          db.prepare('UPDATE analyses SET status = ?, perspectives = ? WHERE id = ?').run(
            'failed',
            JSON.stringify(results),
            analysisId,
          );
          const enoent = outcomes.some((o) => o.enoent);
          send(
            'error',
            enoent
              ? 'Claude CLI를 찾을 수 없습니다. claude가 설치되어 있는지 확인하세요.'
              : '모든 관점 분석에 실패했습니다. 다시 시도해주세요.',
          );
          return;
        }

        send('synthesis_start', {});
        const report = await runSynthesis(analysis, results, guidelineFor('judgment'));

        const { risk_grade, recommendation } = computeVerdict(results);

        db.prepare(
          `UPDATE analyses
           SET status = 'completed', perspectives = ?, risk_grade = ?, recommendation = ?, report = ?
           WHERE id = ?`,
        ).run(JSON.stringify(results), risk_grade, recommendation, report, analysisId);

        const done: AnalysisRunResult = { risk_grade, recommendation, perspectives: results, report };
        send('done', done);
      } catch {
        db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('failed', analysisId);
        send('error', '분석 처리 중 오류가 발생했습니다.');
      } finally {
        close();
      }
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
