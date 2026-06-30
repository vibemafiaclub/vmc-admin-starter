import { getDB } from '@/lib/db';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

function verdictLabel(v: string | null) {
  if (v === 'approved') return '승인';
  if (v === 'rejected') return '거절';
  if (v === 'need_info') return '추가정보';
  return '-';
}

function verdictColor(v: string | null): 'green' | 'red' | 'yellow' | 'gray' {
  if (v === 'approved') return 'green';
  if (v === 'rejected') return 'red';
  if (v === 'need_info') return 'yellow';
  return 'gray';
}

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '대기', running: '분석중', completed: '완료', failed: '실패' };
  return map[s] ?? s;
}

export default function DashboardPage() {
  const db = getDB();

  const total = (db.prepare('SELECT COUNT(*) as cnt FROM analyses').get() as { cnt: number }).cnt;
  const pending = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE status = 'pending'").get() as { cnt: number }).cnt;
  const running = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE status = 'running'").get() as { cnt: number }).cnt;
  const completed = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE status = 'completed'").get() as { cnt: number }).cnt;

  const approved = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE verdict = 'approved'").get() as { cnt: number }).cnt;
  const rejected = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE verdict = 'rejected'").get() as { cnt: number }).cnt;
  const needInfo = (db.prepare("SELECT COUNT(*) as cnt FROM analyses WHERE verdict = 'need_info'").get() as { cnt: number }).cnt;

  const recent = db.prepare(`
    SELECT a.id, a.status, a.verdict, a.created_at,
           m.name as merchant_name, m.category as merchant_category
    FROM analyses a JOIN merchants m ON m.id = a.merchant_id
    ORDER BY a.created_at DESC LIMIT 5
  `).all() as { id: number; status: string; verdict: string | null; created_at: string; merchant_name: string; merchant_category: string }[];

  const stats = [
    { label: '전체', value: total },
    { label: '대기', value: pending },
    { label: '분석중', value: running },
    { label: '완료', value: completed },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-6">대시보드</h1>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e5e5] rounded-lg p-5">
            <div className="text-xs text-[#999] mb-1">{s.label}</div>
            <div className="text-3xl font-semibold text-[#0a0a0a]">{s.value}</div>
          </div>
        ))}
      </div>

      {completed > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '승인', value: approved, color: '#16a34a' },
            { label: '거절', value: rejected, color: '#dc2626' },
            { label: '추가정보 요청', value: needInfo, color: '#d97706' },
          ].map((v) => (
            <div key={v.label} className="bg-white border border-[#e5e5e5] rounded-lg p-5">
              <div className="text-xs mb-1" style={{ color: v.color }}>{v.label}</div>
              <div className="text-3xl font-semibold text-[#0a0a0a]">{v.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-[#e5e5e5] rounded-lg">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <h2 className="text-sm font-medium text-[#0a0a0a]">최근 분석</h2>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#999]">
            분석 내역이 없습니다.{' '}
            <Link href="/analyses/new" className="underline text-[#0a0a0a]">신규 분석을 시작하세요.</Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/analyses/${r.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#fafafa] transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-[#0a0a0a]">{r.merchant_name}</div>
                  <div className="text-xs text-[#999] mt-0.5">{r.merchant_category} · {r.created_at}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#aaa]">{statusLabel(r.status)}</span>
                  {r.verdict && (
                    <Badge color={verdictColor(r.verdict)}>{verdictLabel(r.verdict)}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
