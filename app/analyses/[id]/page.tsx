'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  AnalysisWithMerchant,
  DecisionResult,
  PerspectiveDoneEvent,
  PerspectiveKey,
  PerspectiveResult,
  PerspectiveStartEvent,
  Recommendation,
  RiskLevel,
} from '@/types';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red';

function riskLabel(r: RiskLevel): string {
  return r === 'low' ? '저위험' : r === 'medium' ? '중위험' : '고위험';
}

function riskColor(r: RiskLevel): BadgeColor {
  return r === 'low' ? 'green' : r === 'medium' ? 'yellow' : 'red';
}

function recommendationLabel(r: Recommendation): string {
  return r === 'approved' ? '승인 권고' : r === 'rejected' ? '거절 권고' : '추가정보 필요';
}

function decisionLabel(r: Recommendation): string {
  return r === 'approved' ? '승인' : r === 'rejected' ? '거절' : '추가정보';
}

function decisionColor(r: Recommendation): BadgeColor {
  return r === 'approved' ? 'green' : r === 'rejected' ? 'red' : 'yellow';
}

const infoRow = 'flex gap-3 text-sm';
const infoLabel = 'text-[#999] w-20 shrink-0';

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<AnalysisWithMerchant | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<PerspectiveStartEvent[]>([]);
  const [progressDone, setProgressDone] = useState<Partial<Record<PerspectiveKey, PerspectiveDoneEvent>>>({});
  const [synthesizing, setSynthesizing] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<PerspectiveKey>>(new Set());

  const [decisionValue, setDecisionValue] = useState<Recommendation | ''>('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/analyses/${id}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    setRunning(false);
    setProgress([]);
    setProgressDone({});
    setSynthesizing(false);
    setRunError(null);
    setExpanded(new Set());
    setDecisionValue('');
    setMemo('');
    setSaveError(null);
    fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    if (!data) return;
    setDecisionValue(data.final_decision ?? '');
    setMemo(data.decision_memo ?? '');
  }, [data?.id]);

  const startAnalysis = async () => {
    setRunning(true);
    setRunError(null);
    setProgress([]);
    setProgressDone({});
    setSynthesizing(false);

    const res = await fetch(`/api/analyses/${id}/run`, { method: 'POST' });
    if (!res.ok || !res.body) {
      setRunError('분석 시작에 실패했습니다.');
      setRunning(false);
      await fetchData();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const lines = part.split('\n');
        const eventLine = lines.find((l) => l.startsWith('event:'));
        const dataLine = lines.find((l) => l.startsWith('data:'));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.slice('event:'.length).trim();
        const payload = JSON.parse(dataLine.slice('data:'.length).trim());

        if (event === 'perspective_start') {
          const ev = payload as PerspectiveStartEvent;
          setProgress((prev) => (prev.some((p) => p.key === ev.key) ? prev : [...prev, ev]));
        } else if (event === 'perspective_done') {
          const ev = payload as PerspectiveDoneEvent;
          setProgressDone((prev) => ({ ...prev, [ev.key]: ev }));
        } else if (event === 'synthesis_start') {
          setSynthesizing(true);
        } else if (event === 'done') {
          await fetchData();
          setRunning(false);
          return;
        } else if (event === 'error') {
          setRunError(typeof payload === 'string' ? payload : '분석 중 오류가 발생했습니다.');
          await fetchData();
          setRunning(false);
          return;
        }
      }
    }

    await fetchData();
    setRunning(false);
  };

  const toggleExpanded = (key: PerspectiveKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveDecision = async () => {
    if (!decisionValue) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/analyses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_decision: decisionValue, decision_memo: memo.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? '결정 저장에 실패했습니다.');
        return;
      }
      const updated: DecisionResult = await res.json();
      setData((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setSaveError('결정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const reAnalyze = async () => {
    if (!data) return;
    setReanalyzing(true);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: data.merchant_id }),
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
    return <div className="text-sm text-[#999]">분석을 찾을 수 없습니다.</div>;
  }
  if (!data) {
    return <div className="text-sm text-[#999]">불러오는 중...</div>;
  }

  const perspectives: PerspectiveResult[] = data.perspectives ? JSON.parse(data.perspectives) : [];
  const showCTA = (data.status === 'pending' || data.status === 'failed') && !running;
  const showLive = running || (data.status === 'running' && !running);
  const isCompleted = data.status === 'completed';

  return (
    <div className="max-w-3xl print-area">
      <div className="no-print flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-[#999]">
          <Link href="/analyses" className="hover:text-[#0a0a0a]">분석 내역</Link>
          <span>/</span>
          <span className="text-[#0a0a0a]">{data.merchant_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/merchants/${data.merchant_id}`}>
            <Button variant="ghost" size="sm">이 가맹점 이력</Button>
          </Link>
          {isCompleted && (
            <>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>인쇄 / PDF</Button>
              <Button variant="secondary" size="sm" onClick={reAnalyze} disabled={reanalyzing}>
                {reanalyzing ? '생성 중...' : '재심사'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">{data.merchant_name}</h1>
        <div className="text-xs text-[#999] mt-1 font-mono">
          {data.business_number} · {data.merchant_category}
        </div>
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 mb-4">
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
          {data.submitted_docs && (
            <div className={infoRow}>
              <span className={clsx(infoLabel, 'pt-0.5')}>제출 서류</span>
              <span className="text-[#333] whitespace-pre-wrap leading-relaxed">{data.submitted_docs}</span>
            </div>
          )}
          {!data.representative && !data.address && !data.submitted_docs && (
            <span className="text-sm text-[#999]">제출 정보 없음</span>
          )}
        </div>
      </div>

      {showCTA && (
        <div className="no-print bg-white border border-[#e5e5e5] rounded-lg p-8 text-center">
          {runError ? (
            <p className="text-xs text-red-600 mb-3">{runError}</p>
          ) : data.status === 'failed' ? (
            <p className="text-xs text-red-500 mb-3">이전 분석이 실패했습니다.</p>
          ) : null}
          <p className="text-sm text-[#555] mb-4">
            AI 에이전트가 신원·업종·평판·서류 4개 관점에서 위험도를 분석합니다.
          </p>
          <Button onClick={startAnalysis}>
            {data.status === 'failed' ? '분석 재실행' : '분석 실행'}
          </Button>
        </div>
      )}

      {showLive && (
        <div className="no-print bg-white border border-[#e5e5e5] rounded-lg p-5">
          <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">분석 진행 중</div>
          {running ? (
            <>
              <div className="space-y-2">
                {progress.map((p) => {
                  const doneEv = progressDone[p.key];
                  return (
                    <div key={p.key} className="flex items-center justify-between text-sm">
                      <span className="text-[#333]">{p.title}</span>
                      {doneEv ? (
                        doneEv.status === 'failed' ? (
                          <Badge color="gray">분석불가</Badge>
                        ) : (
                          <Badge color={riskColor(doneEv.risk_level)}>{riskLabel(doneEv.risk_level)}</Badge>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-[#999]">
                          <span className="w-1.5 h-1.5 bg-[#999] rounded-full animate-pulse" />
                          분석 중…
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-[#999]">
                {synthesizing ? '종합판정 중…' : progress.length === 0 ? '분석을 요청하는 중…' : null}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#999]">분석이 진행 중입니다. 잠시 후 새로고침하세요.</p>
          )}
        </div>
      )}

      {isCompleted && (
        <>
          {data.risk_grade && data.recommendation && (
            <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 mb-4 flex flex-wrap items-center gap-x-10 gap-y-3">
              <div>
                <div className="text-xs text-[#999] mb-1.5">종합 위험등급</div>
                <Badge color={riskColor(data.risk_grade)} size="md">{riskLabel(data.risk_grade)}</Badge>
              </div>
              <div>
                <div className="text-xs text-[#999] mb-1.5">AI 권고</div>
                <Badge color={decisionColor(data.recommendation)} size="md">
                  {recommendationLabel(data.recommendation)}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {perspectives.map((p) => (
              <div key={p.key} className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0a0a0a]">{p.title}</span>
                  {p.status === 'failed' ? (
                    <Badge color="gray">분석불가</Badge>
                  ) : (
                    <Badge color={riskColor(p.risk_level)}>{riskLabel(p.risk_level)}</Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpanded(p.key)}
                  className="no-print mt-2 text-xs text-[#777] hover:text-[#0a0a0a]"
                >
                  {expanded.has(p.key) ? '근거 접기' : '근거 보기'}
                </button>
                <p
                  className={clsx(
                    'perspective-findings mt-2 text-xs text-[#555] leading-relaxed whitespace-pre-wrap',
                    !expanded.has(p.key) && 'hidden',
                  )}
                >
                  {p.findings}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 mb-4">
            <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">종합 보고서</div>
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{data.report}</p>
          </div>

          <div className="bg-white border border-[#e5e5e5] rounded-lg p-5">
            <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">심사자 최종결정</div>

            {data.recommendation && (
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="text-[#999]">AI 권고</span>
                <Badge color={decisionColor(data.recommendation)}>
                  {recommendationLabel(data.recommendation)}
                </Badge>
              </div>
            )}

            <div className="no-print space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1.5">최종 결정</label>
                <select
                  value={decisionValue}
                  onChange={(e) => setDecisionValue(e.target.value as Recommendation | '')}
                  className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0a0a0a]"
                >
                  <option value="">결정을 선택하세요</option>
                  <option value="approved">승인</option>
                  <option value="rejected">거절</option>
                  <option value="need_info">추가정보</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#555] mb-1.5">메모 (선택)</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  placeholder="결정 이유를 기록하세요."
                  className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:border-[#0a0a0a]"
                />
              </div>
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              <div className="flex items-center gap-3">
                <Button onClick={saveDecision} disabled={saving || !decisionValue}>
                  {saving ? '저장 중...' : '결정 저장'}
                </Button>
                {data.final_decision && data.decided_at && (
                  <span className="text-xs text-[#999]">
                    결정자 {data.decided_by} · {data.decided_at}
                  </span>
                )}
              </div>
            </div>

            <div className="print-only mt-2 space-y-1 text-sm">
              <div>
                <span className="text-[#999]">최종 결정: </span>
                {data.final_decision ? decisionLabel(data.final_decision) : '미결정'}
              </div>
              {data.decision_memo && (
                <div>
                  <span className="text-[#999]">메모: </span>
                  {data.decision_memo}
                </div>
              )}
              {data.final_decision && data.decided_at && (
                <div className="text-[#999]">
                  결정자 {data.decided_by} · {data.decided_at}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
