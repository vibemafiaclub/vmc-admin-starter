import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM guidelines ORDER BY id').all();
  return NextResponse.json(rows);
}
