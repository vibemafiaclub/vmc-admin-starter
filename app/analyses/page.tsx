'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import type { AnalysisListItem, AnalysisStatus, Recommendation, RiskLevel } from '@/types';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue';

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

const RISK_OPTIONS: { value: '' | RiskLevel; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'low', label: '저위험' },
  { value: 'medium', label: '중위험' },
  { value: 'high', label: '고위험' },
];

const RECOMMENDATION_OPTIONS: { value: '' | Recommendation; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거절' },
  { value: 'need_info', label: '추가정보' },
];

const STATUS_OPTIONS: { value: '' | AnalysisStatus; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'running', label: '실행중' },
  { value: 'completed', label: '완료' },
  { value: 'failed', label: '실패' },
];

const selectClass =
  'border border-[#e5e5e5] rounded-md px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-[#0a0a0a]';

function AnalysesContent() {
  const router = useRouter();
  const initialFilter = useSearchParams().get('filter');

  const [rows, setRows] = useState<AnalysisListItem[] | null>(null);
  const [riskFilter, setRiskFilter] = useState<'' | RiskLevel>(
    initialFilter === 'high_risk' ? 'high' : '',
  );
  const [recommendationFilter, setRecommendationFilter] = useState<'' | Recommendation>('');
  const [statusFilter, setStatusFilter] = useState<'' | AnalysisStatus>('');
  const [pendingOnly, setPendingOnly] = useState(initialFilter === 'pending');

  useEffect(() => {
    fetch('/api/analyses')
      .then((r) => r.json())
      .then((data: AnalysisListItem[]) => setRows(data));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((a) => {
      if (riskFilter && a.risk_grade !== riskFilter) return false;
      if (recommendationFilter && a.recommendation !== recommendationFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (pendingOnly && !isPendingDecision(a)) return false;
      return true;
    });
  }, [rows, riskFilter, recommendationFilter, statusFilter, pendingOnly]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">분석 목록</h1>
        <Link
          href="/analyses/new"
          className="text-xs font-medium bg-[#0a0a0a] text-white px-3 py-1.5 rounded-md hover:bg-[#333] transition-colors"
        >
          + 새 분석
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-1.5 text-xs text-[#999]">
          위험등급
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as '' | RiskLevel)}
            className={selectClass}
          >
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#999]">
          권고
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value as '' | Recommendation)}
            className={selectClass}
          >
            {RECOMMENDATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#999]">
          상태
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | AnalysisStatus)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#555] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          미결정만
        </label>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg">
        {rows === null ? (
          <div className="py-16 text-center text-sm text-[#999]">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#999]">
            아직 분석이 없습니다.{' '}
            <Link href="/analyses/new" className="text-[#0a0a0a] underline">새 분석</Link>을 시작하세요.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#999]">조건에 맞는 분석이 없습니다.</div>
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
              {filtered.map((a) => (
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

export default function AnalysesPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl py-16 text-center text-sm text-[#999]">불러오는 중...</div>}>
      <AnalysesContent />
    </Suspense>
  );
}
