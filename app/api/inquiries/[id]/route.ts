import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { maskValue, maskCompany } from '@/lib/mask';
import type { Inquiry } from '@/types/index';

function getMaskEnabled(): boolean {
  const db = getDB();
  const row = db.prepare("SELECT value FROM settings WHERE key='masking_enabled'").get() as { value: string } | undefined;
  return row?.value === 'true';
}

function applyMasking(inquiry: Inquiry, maskEnabled: boolean): Inquiry {
  return {
    ...inquiry,
    company: maskCompany(inquiry.id, inquiry.company, maskEnabled),
    contact_name: maskValue(inquiry.contact_name, 'name', maskEnabled),
    contact_email: maskValue(inquiry.contact_email, 'email', maskEnabled),
    contact_phone: maskValue(inquiry.contact_phone, 'phone', maskEnabled),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: string };

    db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, id);

    const updated = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id) as Inquiry | undefined;

    if (!updated) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json(applyMasking(updated, maskEnabled));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
