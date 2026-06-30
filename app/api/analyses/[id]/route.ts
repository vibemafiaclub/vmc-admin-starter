import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const row = db.prepare(`
    SELECT a.*, m.name as merchant_name, m.business_number,
           m.category as merchant_category, m.address, m.submitted_docs
    FROM analyses a
    JOIN merchants m ON m.id = a.merchant_id
    WHERE a.id = ?
  `).get(parseInt(id));
  if (!row) return new Response('Not found', { status: 404 });
  return NextResponse.json(row);
}
