import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { AnalysisListItem } from '@/types';

export async function GET() {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT a.id, a.status, a.risk_grade, a.recommendation, a.final_decision, a.created_at,
              a.merchant_id, m.name AS merchant_name, m.category AS merchant_category
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       ORDER BY a.created_at DESC, a.id DESC`,
    )
    .all() as AnalysisListItem[];
  return NextResponse.json(rows);
}
