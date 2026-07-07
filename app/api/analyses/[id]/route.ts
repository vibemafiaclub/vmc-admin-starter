import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { AnalysisWithMerchant, DecisionResult, Recommendation } from '@/types';

const VALID_DECISIONS: Recommendation[] = ['approved', 'rejected', 'need_info'];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const row = db
    .prepare(
      `SELECT a.*, m.name AS merchant_name, m.category AS merchant_category,
              m.business_number, m.representative, m.address, m.submitted_docs
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       WHERE a.id = ?`,
    )
    .get(parseInt(id, 10)) as AnalysisWithMerchant | undefined;

  if (!row) return NextResponse.json({ error: '분석을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysisId = parseInt(id, 10);
  const body = await req.json().catch(() => ({}));

  const finalDecision = body.final_decision;
  if (!VALID_DECISIONS.includes(finalDecision)) {
    return NextResponse.json({ error: '유효하지 않은 최종 결정 값입니다.' }, { status: 400 });
  }
  const decisionMemo =
    typeof body.decision_memo === 'string' && body.decision_memo.trim()
      ? body.decision_memo.trim()
      : null;

  const db = getDB();
  const analysis = db
    .prepare('SELECT id FROM analyses WHERE id = ?')
    .get(analysisId) as { id: number } | undefined;
  if (!analysis) {
    return NextResponse.json({ error: '분석을 찾을 수 없습니다.' }, { status: 404 });
  }

  const reviewer = db
    .prepare("SELECT value FROM settings WHERE key = 'reviewer_name'")
    .get() as { value: string } | undefined;
  const decidedBy = reviewer?.value ?? '심사자';

  db.prepare(
    `UPDATE analyses
     SET final_decision = ?, decision_memo = ?, decided_by = ?, decided_at = datetime('now', 'localtime')
     WHERE id = ?`,
  ).run(finalDecision, decisionMemo, decidedBy, analysisId);

  const updated = db
    .prepare('SELECT final_decision, decision_memo, decided_by, decided_at FROM analyses WHERE id = ?')
    .get(analysisId) as DecisionResult;

  return NextResponse.json(updated);
}
