import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { maskValue, maskCompany } from '@/lib/mask';
import type { Email } from '@/types/index';

function getMaskEnabled(): boolean {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM settings WHERE key='masking_enabled'")
    .get() as { value: string } | undefined;
  return row?.value === 'true';
}

export async function GET() {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();

    const rows = db
      .prepare('SELECT * FROM emails ORDER BY received_at DESC')
      .all() as Email[];

    if (!maskEnabled) {
      return NextResponse.json(rows);
    }

    // Build inquiry → masked company cache
    const companyCache = new Map<string, string>();
    const masked = rows.map((email) => {
      let subject = email.subject;
      if (email.inquiry_id) {
        if (!companyCache.has(email.inquiry_id)) {
          const inq = db
            .prepare('SELECT id, company FROM inquiries WHERE id = ?')
            .get(email.inquiry_id) as { id: string; company: string } | undefined;
          if (inq) {
            companyCache.set(inq.id, maskCompany(inq.id, inq.company, true));
          }
        }
        const maskedCompany = companyCache.get(email.inquiry_id);
        if (maskedCompany) {
          const inq = db
            .prepare('SELECT company FROM inquiries WHERE id = ?')
            .get(email.inquiry_id) as { company: string } | undefined;
          if (inq) {
            subject = subject.replaceAll(inq.company, maskedCompany);
          }
        }
      }
      return {
        ...email,
        subject,
        sender_name: maskValue(email.sender_name, 'name', true),
        sender_email: maskValue(email.sender_email, 'email', true),
      };
    });

    return NextResponse.json(masked);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
