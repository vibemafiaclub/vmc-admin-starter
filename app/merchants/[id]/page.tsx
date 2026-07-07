'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  AnalysisStatus,
  MerchantAnalysisHistoryItem,
  MerchantWithHistory,
  Recommendation,
  RiskLevel,
} from '@/types';

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

function isPendingDecision(a: MerchantAnalysisHistoryItem): boolean {
  return a.status === 'completed' && a.final_decision == null;
}

const infoRow = 'flex gap-3 text-sm';
const infoLabel = 'text-[#999] w-20 shrink-0';

export default function MerchantHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<MerchantWithHistory | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/merchants/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    fetchData();
  }, [id, fetchData]);

  const reAnalyze = async () => {
    if (!data) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: data.id }),
      });
      if (!res.ok) {
        setReanalyzing(false);
        return;
      }
      const { analysisId } = await res.json();
      router.push(`/analyses/${analysisId}`);
    } catch {
      setReanalyzing(false);
    }
  };

  if (notFound) {
    return <div className="text-sm text-[#999]">가맹점을 찾을 수 없습니다.</div>;
  }
  if (!data) {
    return <div className="text-sm text-[#999]">불러오는 중...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-[#999] mb-4">
        <Link href="/analyses" className="hover:text-[#0a0a0a]">분석 목록</Link>
        <span>/</span>
        <span className="text-[#0a0a0a]">{data.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{data.name}</h1>
          <div className="text-xs text-[#999] mt-1 font-mono">
            {data.business_number} · {data.category}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={reAnalyze} disabled={reanalyzing}>
          {reanalyzing ? '생성 중...' : '재심사'}
        </Button>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 mb-6">
        <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">가맹점 정보</div>
        <div className="space-y-2">
          {data.representative && (
            <div className={infoRow}>
              <span className={infoLabel}>대표자</span>
              <span className="text-[#333]">{data.representative}</span>
            </div>
          )}
          {data.address && (
            <div className={infoRow}>
              <span className={infoLabel}>주소</span>
              <span className="text-[#333]">{data.address}</span>
            </div>
          )}
          {!data.representative && !data.address && (
            <span className="text-sm text-[#999]">추가 정보 없음</span>
          )}
        </div>
      </div>

      <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">분석 이력</div>

      {data.analyses.length === 0 ? (
        <div className="bg-white border border-[#e5e5e5] rounded-lg py-16 text-center text-sm text-[#999]">
          아직 분석 이력이 없습니다.
        </div>
      ) : (
        <ol className="relative border-l border-[#e5e5e5] ml-2 space-y-4">
          {data.analyses.map((a) => (
            <li key={a.id} className="ml-5">
              <span className="absolute -left-[5px] mt-4 w-2.5 h-2.5 rounded-full bg-[#0a0a0a]" />
              <button
                type="button"
                onClick={() => router.push(`/analyses/${a.id}`)}
                className="block w-full text-left bg-white border border-[#e5e5e5] rounded-lg p-4 hover:bg-[#fafafa] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#999] font-mono">{a.created_at}</span>
                  <Badge color={statusColor(a.status)}>{statusLabel(a.status)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.risk_grade ? (
                    <Badge color={riskColor(a.risk_grade)}>{riskLabel(a.risk_grade)}</Badge>
                  ) : (
                    <span className="text-xs text-[#ccc]">등급 —</span>
                  )}
                  {a.recommendation ? (
                    <Badge color={recommendationColor(a.recommendation)}>
                      {recommendationLabel(a.recommendation)}
                    </Badge>
                  ) : (
                    <span className="text-xs text-[#ccc]">권고 —</span>
                  )}
                  {a.final_decision ? (
                    <Badge color={decisionColor(a.final_decision)}>
                      최종 {decisionLabel(a.final_decision)}
                    </Badge>
                  ) : isPendingDecision(a) ? (
                    <Badge color="orange">미결정</Badge>
                  ) : (
                    <span className="text-xs text-[#ccc]">최종 —</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
