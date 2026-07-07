import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { Guideline } from '@/types';

export async function GET() {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM guidelines ORDER BY id').all() as Guideline[];
  return NextResponse.json(rows);
}
