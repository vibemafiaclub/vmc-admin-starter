import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { AnalysisListItem, DashboardData, Recommendation } from '@/types';

const RECENT_LIMIT = 6;

function count(db: ReturnType<typeof getDB>, where: string): number {
  return (db.prepare(`SELECT COUNT(*) AS cnt FROM analyses WHERE ${where}`).get() as { cnt: number }).cnt;
}

export async function GET() {
  const db = getDB();

  const pending_decision = count(db, "status = 'completed' AND final_decision IS NULL");
  const high_risk = count(db, "risk_grade = 'high' OR recommendation = 'rejected'");
  const today = count(db, "status = 'completed' AND date(created_at) = date('now', 'localtime')");
  const week = count(
    db,
    "status = 'completed' AND date(created_at) >= date('now', 'localtime', 'weekday 0', '-6 days')",
  );

  const recommendation_dist: Record<Recommendation, number> = { approved: 0, rejected: 0, need_info: 0 };
  const distRows = db
    .prepare(
      "SELECT recommendation AS rec, COUNT(*) AS cnt FROM analyses WHERE recommendation IS NOT NULL GROUP BY recommendation",
    )
    .all() as { rec: Recommendation; cnt: number }[];
  for (const r of distRows) recommendation_dist[r.rec] = r.cnt;

  const recent = db
    .prepare(
      `SELECT a.id, a.status, a.risk_grade, a.recommendation, a.final_decision, a.created_at,
              a.merchant_id, m.name AS merchant_name, m.category AS merchant_category
       FROM analyses a
       JOIN merchants m ON m.id = a.merchant_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT ?`,
    )
    .all(RECENT_LIMIT) as AnalysisListItem[];

  const payload: DashboardData = {
    pending_decision,
    high_risk,
    throughput: { today, week },
    recommendation_dist,
    recent,
  };

  return NextResponse.json(payload);
}
