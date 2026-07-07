'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { AnalysisListItem, AnalysisStatus, DashboardData, Recommendation, RiskLevel } from '@/types';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'orange';

function riskLabel(r: RiskLevel): string {
  return r === 'low' ? '저위험' : r === 'medium' ? '중위험' : '고위험';
}

function riskColor(r: RiskLevel): BadgeColor {
  return r === 'low' ? 'green' : r === 'medium' ? 'yellow' : 'red';
}

function recommendationLabel(r: Recommendation): string {
  return r === 'approved' ? '승인 권고' : r === 'rejected' ? '거절 권고' : '추가정보 필요';
}

function recommendationColor(r: Recommendation): BadgeColor {
  return r === 'approved' ? 'green' : r === 'rejected' ? 'red' : 'yellow';
}

function decisionLabel(r: Recommendation): string {
  return r === 'approved' ? '승인' : r === 'rejected' ? '거절' : '추가정보';
}

function decisionColor(r: Recommendation): BadgeColor {
  return r === 'approved' ? 'green' : r === 'rejected' ? 'red' : 'yellow';
}

function statusLabel(s: AnalysisStatus): string {
  return s === 'pending' ? '대기' : s === 'running' ? '실행중' : s === 'completed' ? '완료' : '실패';
}

function statusColor(s: AnalysisStatus): BadgeColor {
  return s === 'running' ? 'blue' : s === 'failed' ? 'red' : 'gray';
}

function isPendingDecision(a: AnalysisListItem): boolean {
  return a.status === 'completed' && a.final_decision == null;
}

const DIST_META: { key: Recommendation; label: string; bar: string; dot: string }[] = [
  { key: 'approved', label: '승인', bar: 'bg-green-400', dot: 'bg-green-400' },
  { key: 'rejected', label: '거절', bar: 'bg-red-400', dot: 'bg-red-400' },
  { key: 'need_info', label: '추가정보', bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
];

function KpiCard({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  const card = (
    <Card title={title} className={href ? 'h-full cursor-pointer hover:shadow-md transition-shadow' : 'h-full'}>
      {children}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d));
  }, []);

  if (!data) {
    return <div className="text-sm text-[#999]">불러오는 중...</div>;
  }

  const dist = data.recommendation_dist;
  const distTotal = dist.approved + dist.rejected + dist.need_info;

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-6">대시보드</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard title="미결정 대기" href="/analyses?filter=pending">
          <div className="text-3xl font-semibold text-[#0a0a0a]">{data.pending_decision}</div>
          <div className="text-xs text-[#999] mt-1">완료됐지만 최종결정을 기다리는 건</div>
        </KpiCard>

        <KpiCard title="고위험 · 거절권고" href="/analyses?filter=high_risk">
          <div className="text-3xl font-semibold text-[#0a0a0a]">{data.high_risk}</div>
          <div className="text-xs text-[#999] mt-1">고위험 등급 또는 거절 권고</div>
        </KpiCard>

        <KpiCard title="기간별 처리량">
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-semibold text-[#0a0a0a]">{data.throughput.today}</div>
              <div className="text-xs text-[#999] mt-1">오늘 완료</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-[#0a0a0a]">{data.throughput.week}</div>
              <div className="text-xs text-[#999] mt-1">이번주 완료</div>
            </div>
          </div>
        </KpiCard>

        <KpiCard title="권고 분포">
          {distTotal === 0 ? (
            <div className="text-sm text-[#999]">아직 권고 데이터가 없습니다.</div>
          ) : (
            <>
              <div className="flex h-2 rounded-full overflow-hidden bg-[#f0f0f0]">
                {DIST_META.map((m) =>
                  dist[m.key] > 0 ? (
                    <div key={m.key} className={m.bar} style={{ width: `${(dist[m.key] / distTotal) * 100}%` }} />
                  ) : null,
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-[#555]">
                {DIST_META.map((m) => (
                  <span key={m.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                    {m.label} {dist[m.key]}
                  </span>
                ))}
              </div>
            </>
          )}
        </KpiCard>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <h2 className="text-sm font-medium text-[#0a0a0a]">최근 분석</h2>
          <Link href="/analyses" className="text-xs text-[#999] hover:text-[#0a0a0a]">
            전체 보기
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#999]">
            아직 분석이 없습니다.{' '}
            <Link href="/analyses/new" className="text-[#0a0a0a] underline">새 분석</Link>을 시작하세요.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">가맹점명</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">업종</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">종합등급</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">AI 권고</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">최종결정</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">상태</th>
                <th className="text-left text-xs font-medium text-[#999] px-5 py-3">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {data.recent.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/analyses/${a.id}`)}
                  className="hover:bg-[#fafafa] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-[#0a0a0a]">{a.merchant_name}</td>
                  <td className="px-5 py-3.5 text-sm text-[#555]">{a.merchant_category}</td>
                  <td className="px-5 py-3.5">
                    {a.risk_grade ? (
                      <Badge color={riskColor(a.risk_grade)}>{riskLabel(a.risk_grade)}</Badge>
                    ) : (
                      <span className="text-xs text-[#ccc]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {a.recommendation ? (
                      <Badge color={recommendationColor(a.recommendation)}>
                        {recommendationLabel(a.recommendation)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-[#ccc]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {a.final_decision ? (
                      <Badge color={decisionColor(a.final_decision)}>{decisionLabel(a.final_decision)}</Badge>
                    ) : isPendingDecision(a) ? (
                      <Badge color="orange">미결정</Badge>
                    ) : (
                      <span className="text-xs text-[#ccc]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#999] font-mono">{a.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
