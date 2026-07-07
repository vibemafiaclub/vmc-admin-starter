import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { Guideline, GuidelineUpdate } from '@/types';

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { title, content } = (await req.json()) as GuidelineUpdate;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 본문을 모두 입력하세요.' }, { status: 400 });
  }

  const db = getDB();
  db.prepare(`
    INSERT INTO guidelines (key, title, content, updated_at)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(key, title.trim(), content.trim());

  const row = db.prepare('SELECT * FROM guidelines WHERE key = ?').get(key) as Guideline;
  return NextResponse.json(row);
}
