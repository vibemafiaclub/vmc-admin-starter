import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import type { MerchantListItem } from '@/types';

export async function GET() {
  const db = getDB();
  const merchants = db
    .prepare('SELECT id, name, business_number, category FROM merchants ORDER BY id DESC')
    .all() as MerchantListItem[];
  return NextResponse.json({ merchants });
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = getDB();

  let merchantId: number | bigint;

  if (body.merchant_id != null) {
    const merchant = db
      .prepare('SELECT id FROM merchants WHERE id = ?')
      .get(body.merchant_id) as { id: number } | undefined;
    if (!merchant) {
      return NextResponse.json({ error: '가맹점을 찾을 수 없습니다.' }, { status: 404 });
    }
    merchantId = merchant.id;
  } else {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const businessNumber = typeof body.business_number === 'string' ? body.business_number.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';

    if (!name || !businessNumber || !category) {
      return NextResponse.json(
        { error: '상호명·사업자번호·업종은 필수 입력 항목입니다.' },
        { status: 400 },
      );
    }

    const representative = typeof body.representative === 'string' && body.representative.trim()
      ? body.representative.trim()
      : null;
    const address = typeof body.address === 'string' && body.address.trim()
      ? body.address.trim()
      : null;
    const submittedDocs = typeof body.submitted_docs === 'string' && body.submitted_docs.trim()
      ? body.submitted_docs.trim()
      : null;

    const inserted = db
      .prepare(
        'INSERT INTO merchants (name, business_number, representative, category, address, submitted_docs) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(name, businessNumber, representative, category, address, submittedDocs);
    merchantId = inserted.lastInsertRowid;
  }

  const analysis = db
    .prepare("INSERT INTO analyses (merchant_id, status) VALUES (?, 'pending')")
    .run(merchantId);

  return NextResponse.json({ analysisId: Number(analysis.lastInsertRowid) });
}
