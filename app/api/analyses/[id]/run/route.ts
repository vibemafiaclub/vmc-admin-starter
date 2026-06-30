import { getDB } from '@/lib/db';
import { spawn } from 'child_process';

const DEFAULT_GUIDELINES: Record<string, string> = {
  identity: '사업자등록번호, 대표자명, 법인 설립 이력 등 신원 정보의 유효성과 일관성을 확인하라. 허위 정보나 이상 징후가 있는지 판단하라.',
  industry: '해당 업종의 일반적인 위험도를 평가하라. 도박, 성인, 대부업, 가상자산 등 고위험 업종 여부를 반드시 확인하라.',
  reputation: '상호명과 사업자 정보를 기반으로 온라인 평판, 민원, 뉴스, 부정적 이력 등을 조사하라. 관련 기사나 사기 이력이 있는지 확인하라.',
  judgment: '위 세 관점의 분석을 종합하여 최종 판정을 내려라. 위험 요소가 하나라도 high이면 rejected 또는 need_info를 권고하라.',
};

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const analysisId = parseInt(id);

  const analysis = db.prepare(`
    SELECT a.*, m.name, m.business_number, m.category, m.address, m.submitted_docs
    FROM analyses a JOIN merchants m ON m.id = a.merchant_id
    WHERE a.id = ?
  `).get(analysisId) as Record<string, string> | undefined;

  if (!analysis) return new Response('Not found', { status: 404 });
  if (analysis.status !== 'pending' && analysis.status !== 'failed') {
    return new Response('Already running or completed', { status: 400 });
  }

  const guidelineRows = db.prepare('SELECT key, content FROM guidelines').all() as { key: string; content: string }[];
  const guidelineMap = Object.fromEntries(guidelineRows.map((g) => [g.key, g.content]));

  const g = {
    identity: guidelineMap['identity'] ?? DEFAULT_GUIDELINES.identity,
    industry: guidelineMap['industry'] ?? DEFAULT_GUIDELINES.industry,
    reputation: guidelineMap['reputation'] ?? DEFAULT_GUIDELINES.reputation,
    judgment: guidelineMap['judgment'] ?? DEFAULT_GUIDELINES.judgment,
  };

  const prompt = `당신은 PG사 컴플라이언스 분석 에이전트입니다. 아래 가맹점을 다각도로 분석하고 위험도를 평가하세요.

## 가맹점 정보
- 상호명: ${analysis.name}
- 사업자등록번호: ${analysis.business_number}
- 업종: ${analysis.category}
- 주소: ${analysis.address ?? '미제공'}
- 제출 서류 및 정보: ${analysis.submitted_docs ?? '없음'}

## 분석 지침
[신원 확인] ${g.identity}
[업종 위험도] ${g.industry}
[웹 평판] ${g.reputation}
[종합 판정] ${g.judgment}

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요:
{
  "perspectives": [
    { "key": "identity", "title": "신원 확인", "findings": "분석 내용을 상세히 작성", "risk_level": "low" },
    { "key": "industry", "title": "업종 위험도", "findings": "분석 내용을 상세히 작성", "risk_level": "medium" },
    { "key": "reputation", "title": "웹 평판", "findings": "분석 내용을 상세히 작성", "risk_level": "low" }
  ],
  "verdict": "approved",
  "report": "종합 분석 보고서 내용을 2~3문장으로 작성"
}

risk_level 값: low | medium | high
verdict 값: approved | rejected | need_info`;

  db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('running', analysisId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('progress', '분석을 시작합니다...');

      const claude = spawn('claude', ['-p', prompt], { stdio: ['pipe', 'pipe', 'pipe'] });
      claude.stdin?.end();

      let fullOutput = '';

      claude.stdout?.on('data', (chunk: Buffer) => {
        fullOutput += chunk.toString();
      });

      claude.stderr?.on('data', (chunk: Buffer) => {
        const msg = chunk.toString().trim();
        if (msg) send('progress', msg);
      });

      claude.on('close', () => {
        try {
          const jsonMatch = fullOutput.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON in output');
          const result = JSON.parse(jsonMatch[0]);
          db.prepare(`
            UPDATE analyses SET status = 'completed', perspectives = ?, verdict = ?, report = ? WHERE id = ?
          `).run(JSON.stringify(result.perspectives), result.verdict, result.report, analysisId);
          send('done', JSON.stringify(result));
        } catch {
          db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('failed', analysisId);
          send('error', '분석 결과 처리에 실패했습니다. 다시 시도해주세요.');
        }
        controller.close();
      });

      claude.on('error', () => {
        db.prepare('UPDATE analyses SET status = ? WHERE id = ?').run('failed', analysisId);
        send('error', 'Claude CLI를 찾을 수 없습니다. claude가 설치되어 있는지 확인하세요.');
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
