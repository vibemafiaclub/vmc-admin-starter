import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { maskCompany } from '@/lib/mask';
import type { CalendarEvent, Inquiry } from '@/types/index';

function getMaskEnabled(): boolean {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM settings WHERE key='masking_enabled'")
    .get() as { value: string } | undefined;
  return row?.value === 'true';
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let rows: CalendarEvent[];

    if (month) {
      rows = db
        .prepare('SELECT * FROM events WHERE date LIKE ? ORDER BY date ASC, time ASC')
        .all(`${month}%`) as CalendarEvent[];
    } else {
      rows = db
        .prepare('SELECT * FROM events ORDER BY date ASC, time ASC')
        .all() as CalendarEvent[];
    }

    if (!maskEnabled) {
      return NextResponse.json(rows);
    }

    // 마스킹 활성화: inquiry_id로 회사명 조회 후 title에서 치환
    const inquiryCache = new Map<string, string>();
    const masked = rows.map((ev) => {
      if (!ev.inquiry_id) return ev;
      if (!inquiryCache.has(ev.inquiry_id)) {
        const inq = db
          .prepare('SELECT id, company FROM inquiries WHERE id = ?')
          .get(ev.inquiry_id) as Pick<Inquiry, 'id' | 'company'> | undefined;
        if (inq) {
          inquiryCache.set(inq.id, maskCompany(inq.id, inq.company, true));
        }
      }
      const maskedCompany = inquiryCache.get(ev.inquiry_id);
      if (!maskedCompany) return ev;
      // replace company name in title
      return { ...ev, title: ev.title.replace(/^.+ (교육|미팅|콜|기타)$/, `${maskedCompany} $1`) };
    });

    return NextResponse.json(masked);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
