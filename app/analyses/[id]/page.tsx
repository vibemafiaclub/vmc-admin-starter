'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type PerspectiveResult = {
  key: string;
  title: string;
  findings: string;
  risk_level: 'low' | 'medium' | 'high';
};

type AnalysisData = {
  id: number;
  status: string;
  verdict: string | null;
  report: string | null;
  perspectives: string | null;
  created_at: string;
  merchant_name: string;
  business_number: string;
  merchant_category: string;
  address: string | null;
  submitted_docs: string | null;
};

function riskLabel(r: string) {
  if (r === 'low') return '낮음';
  if (r === 'medium') return '보통';
  if (r === 'high') return '높음';
  return r;
}

function riskColor(r: string): 'green' | 'yellow' | 'red' | 'gray' {
  if (r === 'low') return 'green';
  if (r === 'medium') return 'yellow';
  if (r === 'high') return 'red';
  return 'gray';
}

function verdictLabel(v: string | null) {
  if (v === 'approved') return '승인 권고';
  if (v === 'rejected') return '거절 권고';
  if (v === 'need_info') return '추가 정보 요청';
  return null;
}

function verdictColor(v: string | null): 'green' | 'red' | 'yellow' | 'gray' {
  if (v === 'approved') return 'green';
  if (v === 'rejected') return 'red';
  if (v === 'need_info') return 'yellow';
  return 'gray';
}

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/analyses/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startAnalysis = async () => {
    setRunning(true);
    setLogs(['분석을 요청하는 중...']);

    const res = await fetch(`/api/analyses/${id}/run`, { method: 'POST' });
    if (!res.ok || !res.body) {
      setLogs((l) => [...l, '분석 시작에 실패했습니다.']);
      setRunning(false);
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

        const event = eventLine.replace('event:', '').trim();
        const raw = dataLine.replace('data:', '').trim();
        const payload = JSON.parse(raw) as string;

        if (event === 'progress') {
          setLogs((l) => [...l, payload]);
        } else if (event === 'done') {
          setLogs((l) => [...l, '분석이 완료되었습니다.']);
          await fetchData();
          setRunning(false);
          return;
        } else if (event === 'error') {
          setLogs((l) => [...l, `오류: ${payload}`]);
          await fetchData();
          setRunning(false);
          return;
        }
      }
    }

    await fetchData();
    setRunning(false);
  };

  if (!data) {
    return <div className="text-sm text-[#999]">불러오는 중...</div>;
  }

  const perspectives: PerspectiveResult[] = data.perspectives ? JSON.parse(data.perspectives) : [];
  const vLabel = verdictLabel(data.verdict);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4 text-xs text-[#999]">
        <Link href="/analyses" className="hover:text-[#0a0a0a]">분석 내역</Link>
        <span>/</span>
        <span className="text-[#0a0a0a]">{data.merchant_name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{data.merchant_name}</h1>
          <div className="text-xs text-[#999] mt-1 font-mono">
            {data.business_number} · {data.merchant_category}
          </div>
        </div>
        {vLabel && (
          <Badge color={verdictColor(data.verdict)} size="md">{vLabel}</Badge>
        )}
      </div>

      <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 mb-4">
        <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">가맹점 정보</div>
        <div className="space-y-2">
          {data.address && (
            <div className="flex gap-3 text-sm">
              <span className="text-[#999] w-20 shrink-0">주소</span>
              <span className="text-[#333]">{data.address}</span>
            </div>
          )}
          {data.submitted_docs && (
            <div className="flex gap-3 text-sm">
              <span className="text-[#999] w-20 shrink-0 pt-0.5">제출 서류</span>
              <span className="text-[#333] whitespace-pre-wrap leading-relaxed">{data.submitted_docs}</span>
            </div>
          )}
          {!data.address && !data.submitted_docs && (
            <span className="text-sm text-[#999]">제출 정보 없음</span>
          )}
        </div>
      </div>

      {/* pending 상태: 분석 시작 버튼 */}
      {(data.status === 'pending' || data.status === 'failed') && !running && (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-8 text-center">
          {data.status === 'failed' && (
            <p className="text-xs text-red-500 mb-3">이전 분석이 실패했습니다.</p>
          )}
          <p className="text-sm text-[#555] mb-4">AI 에이전트가 신원·업종·웹 평판을 다각도로 분석합니다.</p>
          <Button onClick={startAnalysis}>분석 시작</Button>
        </div>
      )}

      {/* 분석 진행 중 */}
      {(running || (data.status === 'running' && !running)) && (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-5">
          <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">분석 진행 중</div>
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-[#ccc] font-mono text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[#333]">{log}</span>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-xs text-[#999] mt-3">
                <div className="w-1.5 h-1.5 bg-[#999] rounded-full animate-pulse" />
                분석 중...
              </div>
            )}
            {data.status === 'running' && !running && (
              <p className="text-xs text-[#999] mt-2">분석이 진행 중입니다. 잠시 후 새로고침하세요.</p>
            )}
          </div>
        </div>
      )}

      {/* 완료 상태: 결과 표시 */}
      {data.status === 'completed' && perspectives.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {perspectives.map((p) => (
              <div key={p.key} className="bg-white border border-[#e5e5e5] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#0a0a0a]">{p.title}</span>
                  <Badge color={riskColor(p.risk_level)}>{riskLabel(p.risk_level)}</Badge>
                </div>
                <p className="text-xs text-[#555] leading-relaxed">{p.findings}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e5e5e5] rounded-lg p-5">
            <div className="text-xs font-medium text-[#999] uppercase tracking-wider mb-3">종합 보고서</div>
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{data.report}</p>
          </div>
        </>
      )}
    </div>
  );
}
