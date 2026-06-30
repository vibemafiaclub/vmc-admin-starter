import { getDB } from '@/lib/db';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '대기', running: '분석중', completed: '완료', failed: '실패' };
  return map[s] ?? s;
}

function verdictLabel(v: string | null) {
  if (v === 'approved') return '승인';
  if (v === 'rejected') return '거절';
  if (v === 'need_info') return '추가정보';
  return null;
}

function verdictColor(v: string | null): 'green' | 'red' | 'yellow' | 'gray' {
  if (v === 'approved') return 'green';
  if (v === 'rejected') return 'red';
  if (v === 'need_info') return 'yellow';
  return 'gray';
}

export default function AnalysesPage() {
  const db = getDB();
  const rows = db.prepare(`
    SELECT a.id, a.status, a.verdict, a.created_at,
           m.name as merchant_name, m.category as merchant_category
    FROM analyses a JOIN merchants m ON m.id = a.merchant_id
    ORDER BY a.created_at DESC
  `).all() as { id: number; status: string; verdict: string | null; created_at: string; merchant_name: string; merchant_category: string }[];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">분석 내역</h1>
        <Link
          href="/analyses/new"
          className="text-xs font-medium bg-[#0a0a0a] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition-colors"
        >
          + 신규 분석
        </Link>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#999]">
            분석 내역이 없습니다.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">상호명</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">업종</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">상태</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">판정</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">등록일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/analyses/${r.id}`} className="text-sm font-medium text-[#0a0a0a] hover:underline">
                      {r.merchant_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#555]">{r.merchant_category}</td>
                  <td className="px-5 py-3.5 text-xs text-[#777]">{statusLabel(r.status)}</td>
                  <td className="px-5 py-3.5">
                    {r.verdict ? (
                      <Badge color={verdictColor(r.verdict)}>{verdictLabel(r.verdict)}</Badge>
                    ) : (
                      <span className="text-xs text-[#ccc]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#999] font-mono">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
