import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  const db = getDB();
  const rows = db.prepare(`
    SELECT a.id, a.status, a.verdict, a.created_at,
           m.name as merchant_name, m.category as merchant_category
    FROM analyses a
    JOIN merchants m ON m.id = a.merchant_id
    ORDER BY a.created_at DESC
  `).all();
  return NextResponse.json(rows);
}
