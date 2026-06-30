'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const SLOTS = [
  { key: 'identity', title: '신원 확인' },
  { key: 'industry', title: '업종 위험도' },
  { key: 'reputation', title: '웹 평판 조사' },
  { key: 'judgment', title: '종합 판정' },
];

const DEFAULTS: Record<string, string> = {
  identity: '사업자등록번호, 대표자명, 법인 설립 이력 등 신원 정보의 유효성과 일관성을 확인하라. 허위 정보나 이상 징후가 있는지 판단하라.',
  industry: '해당 업종의 일반적인 위험도를 평가하라. 도박, 성인, 대부업, 가상자산 등 고위험 업종 여부를 반드시 확인하라.',
  reputation: '상호명과 사업자 정보를 기반으로 온라인 평판, 민원, 뉴스, 부정적 이력 등을 조사하라. 관련 기사나 사기 이력이 있는지 확인하라.',
  judgment: '위 세 관점의 분석을 종합하여 최종 판정을 내려라. 위험 요소가 하나라도 high이면 rejected 또는 need_info를 권고하라.',
};

export default function GuidelinesPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/guidelines')
      .then((r) => r.json())
      .then((rows: { key: string; content: string }[]) => {
        const map: Record<string, string> = {};
        rows.forEach((r) => { map[r.key] = r.content; });
        setValues(map);
      });
  }, []);

  const save = async (key: string, title: string) => {
    setSaving((s) => ({ ...s, [key]: true }));
    await fetch(`/api/guidelines/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: values[key] ?? DEFAULTS[key] }),
    });
    setSaving((s) => ({ ...s, [key]: false }));
    setSaved((s) => ({ ...s, [key]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">세부 지침 관리</h1>
        <p className="text-xs text-[#999] mt-1">
          각 분석 관점의 지침을 수정합니다. 저장 후 새 분석부터 적용됩니다.
        </p>
      </div>

      <div className="space-y-4">
        {SLOTS.map(({ key, title }) => (
          <div key={key} className="bg-white border border-[#e5e5e5] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[#0a0a0a]">{title}</h2>
              <span className="text-xs font-mono text-[#ccc]">{key}</span>
            </div>
            <textarea
              rows={4}
              value={values[key] ?? DEFAULTS[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a0a0a] bg-white resize-none transition-colors"
            />
            <div className="flex justify-end mt-3">
              <Button onClick={() => save(key, title)} disabled={saving[key]}>
                {saved[key] ? '저장됨 ✓' : saving[key] ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
