import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const db = getDB();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('masking_enabled') as
      | { value: string }
      | undefined;
    const masking_enabled = row ? row.value === 'true' : true;
    return NextResponse.json({ masking_enabled });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const masking_enabled: boolean = body.masking_enabled;
    const db = getDB();
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
      String(masking_enabled),
      'masking_enabled'
    );
    return NextResponse.json({ masking_enabled });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
