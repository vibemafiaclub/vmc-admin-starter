import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { Project } from '@/types/index';

export async function GET() {
  try {
    const db = getDB();
    const rows = db.prepare('SELECT * FROM projects ORDER BY start_date DESC').all() as Project[];
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
