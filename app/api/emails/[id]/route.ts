import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { maskValue, maskCompany } from '@/lib/mask';
import type { Email, EmailChat } from '@/types/index';

function getMaskEnabled(): boolean {
  const db = getDB();
  const row = db
    .prepare("SELECT value FROM settings WHERE key='masking_enabled'")
    .get() as { value: string } | undefined;
  return row?.value === 'true';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();
    const { id } = await params;

    const email = db
      .prepare('SELECT * FROM emails WHERE id = ?')
      .get(parseInt(id)) as Email | undefined;

    if (!email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const chats = db
      .prepare('SELECT * FROM email_chats WHERE email_id = ? ORDER BY id ASC')
      .all(parseInt(id)) as EmailChat[];

    if (!maskEnabled) {
      return NextResponse.json({ email, chats });
    }

    let maskedEmail = { ...email };
    if (email.inquiry_id) {
      const inq = db
        .prepare('SELECT id, company FROM inquiries WHERE id = ?')
        .get(email.inquiry_id) as { id: string; company: string } | undefined;
      if (inq) {
        const maskedCompany = maskCompany(inq.id, inq.company, true);
        maskedEmail.subject = maskedEmail.subject.replaceAll(inq.company, maskedCompany);
      }
    }
    maskedEmail = {
      ...maskedEmail,
      sender_name: maskValue(maskedEmail.sender_name, 'name', true),
      sender_email: maskValue(maskedEmail.sender_email, 'email', true),
    };

    return NextResponse.json({ email: maskedEmail, chats });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = getDB();
    const { id } = await params;
    const { action } = (await request.json()) as { action: 'approve' | 'reject' };

    if (action === 'approve') {
      db.prepare(
        "UPDATE emails SET is_replied = 1, draft_status = 'approved' WHERE id = ?",
      ).run(parseInt(id));
    }

    const updated = db
      .prepare('SELECT * FROM emails WHERE id = ?')
      .get(parseInt(id)) as Email;
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
