import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { title, content } = await req.json();
  const db = getDB();
  db.prepare(`
    INSERT INTO guidelines (key, title, content, updated_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(key, title, content);
  const row = db.prepare('SELECT * FROM guidelines WHERE key = ?').get(key);
  return NextResponse.json(row);
}
