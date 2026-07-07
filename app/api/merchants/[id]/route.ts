import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { Merchant, MerchantAnalysisHistoryItem, MerchantWithHistory } from '@/types';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const merchantId = parseInt(id, 10);
  const db = getDB();

  const merchant = db
    .prepare(
      `SELECT id, name, business_number, representative, category, address, submitted_docs, created_at
       FROM merchants WHERE id = ?`,
    )
    .get(merchantId) as Merchant | undefined;

  if (!merchant) {
    return NextResponse.json({ error: '가맹점을 찾을 수 없습니다.' }, { status: 404 });
  }

  const analyses = db
    .prepare(
      `SELECT id, status, risk_grade, recommendation, final_decision, created_at
       FROM analyses
       WHERE merchant_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(merchantId) as MerchantAnalysisHistoryItem[];

  const body: MerchantWithHistory = { ...merchant, analyses };
  return NextResponse.json(body);
}
