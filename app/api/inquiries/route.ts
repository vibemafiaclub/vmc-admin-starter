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

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const conditions: string[] = [];
    const params: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM inquiries ${where} ORDER BY received_at DESC`;

    const rows = db.prepare(sql).all(...params) as Inquiry[];
    const masked = rows.map((row) => applyMasking(row, maskEnabled));

    return NextResponse.json(masked);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
