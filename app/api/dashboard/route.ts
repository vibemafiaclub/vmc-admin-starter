import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { maskValue, maskCompany } from '@/lib/mask';
import type { Inquiry, DashboardStats } from '@/types/index';

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

export async function GET() {
  try {
    const db = getDB();
    const maskEnabled = getMaskEnabled();

    const activeInquiriesRow = db
      .prepare("SELECT COUNT(*) as count FROM inquiries WHERE status IN ('received','in_progress')")
      .get() as { count: number };

    const pipelineTotalRow = db
      .prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM inquiries WHERE status IN ('received','in_progress')")
      .get() as { total: number };

    const activeProjectsRow = db
      .prepare("SELECT COUNT(*) as count FROM projects WHERE status='active'")
      .get() as { count: number };

    const upcomingEventsRow = db
      .prepare("SELECT COUNT(*) as count FROM events WHERE date >= date('now') AND date <= date('now','+7 days')")
      .get() as { count: number };

    const stats: DashboardStats = {
      active_inquiries: activeInquiriesRow.count,
      pipeline_total: pipelineTotalRow.total,
      active_projects: activeProjectsRow.count,
      upcoming_events: upcomingEventsRow.count,
    };

    const recentRows = db
      .prepare('SELECT * FROM inquiries ORDER BY received_at DESC LIMIT 5')
      .all() as Inquiry[];

    const recent_inquiries = recentRows.map((row) => applyMasking(row, maskEnabled));

    return NextResponse.json({ stats, recent_inquiries });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
