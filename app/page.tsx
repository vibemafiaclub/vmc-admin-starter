import { Inbox, TrendingUp, FolderOpen, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { DashboardStats, Inquiry, InquiryStatus, BadgeColor } from '@/types';

interface DashboardResponse {
  stats: DashboardStats;
  recent_inquiries: Inquiry[];
}

const statusColor: Record<InquiryStatus, BadgeColor> = {
  received: 'gray',
  in_progress: 'blue',
  completed: 'green',
  closed: 'slate',
};

const statusLabel: Record<InquiryStatus, string> = {
  received: '접수',
  in_progress: '진행중',
  completed: '완료',
  closed: '종료',
};

const categoryColor: Record<string, BadgeColor> = {
  B2B교육: 'purple',
  AX컨설팅: 'orange',
  강연의뢰: 'teal',
  브랜디드콘텐츠협업: 'pink',
  기타: 'gray',
};

function formatPipeline(value: number): string {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(1) + '억원';
  }
  if (value >= 10000) {
    return Math.floor(value / 10000) + '만원';
  }
  return value + '원';
}

async function getDashboard(): Promise<DashboardResponse> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${base}/api/dashboard`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load dashboard: ${res.status}`);
  }
  return res.json();
}

export default async function DashboardPage() {
  const { stats, recent_inquiries } = await getDashboard();

  const kpis = [
    {
      label: '활성 문의',
      value: String(stats.active_inquiries),
      Icon: Inbox,
      iconClass: 'text-indigo-500 bg-gray-100',
    },
    {
      label: '파이프라인',
      value: formatPipeline(stats.pipeline_total),
      Icon: TrendingUp,
      iconClass: 'text-green-500 bg-gray-100',
    },
    {
      label: '진행 중 프로젝트',
      value: String(stats.active_projects),
      Icon: FolderOpen,
      iconClass: 'text-blue-500 bg-gray-100',
    },
    {
      label: '이번 주 일정',
      value: String(stats.upcoming_events),
      Icon: CalendarDays,
      iconClass: 'text-yellow-500 bg-gray-100',
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">대시보드</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, Icon, iconClass }) => (
          <Card key={label}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
              >
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="최근 문의">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="py-2 pr-4 font-medium">ID</th>
                <th className="py-2 pr-4 font-medium">회사</th>
                <th className="py-2 pr-4 font-medium">카테고리</th>
                <th className="py-2 pr-4 font-medium">상태</th>
                <th className="py-2 pr-4 font-medium">수신일</th>
              </tr>
            </thead>
            <tbody>
              {recent_inquiries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-gray-400"
                  >
                    최근 문의가 없습니다.
                  </td>
                </tr>
              ) : (
                recent_inquiries.map((inq) => (
                  <tr
                    key={inq.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                      {inq.id}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">{inq.company}</td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        label={inq.category}
                        color={categoryColor[inq.category] ?? 'gray'}
                      />
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        label={statusLabel[inq.status] ?? inq.status}
                        color={statusColor[inq.status] ?? 'gray'}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {inq.received_at ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
