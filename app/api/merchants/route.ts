import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(req: Request) {
  const { name, business_number, category, address, submitted_docs } = await req.json();
  const db = getDB();

  const merchant = db.prepare(
    'INSERT INTO merchants (name, business_number, category, address, submitted_docs) VALUES (?, ?, ?, ?, ?)'
  ).run(name, business_number, category, address || null, submitted_docs || null);

  const analysis = db.prepare('INSERT INTO analyses (merchant_id) VALUES (?)').run(merchant.lastInsertRowid);

  return NextResponse.json({ analysisId: analysis.lastInsertRowid });
}
