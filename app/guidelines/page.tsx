'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Guideline } from '@/types';

const SECTIONS: { key: string; header: string }[] = [
  { key: 'identity', header: '신원확인' },
  { key: 'industry', header: '업종위험도' },
  { key: 'reputation', header: '평판/부정이력' },
  { key: 'documents', header: '제출서류 정합성' },
  { key: 'judgment', header: '종합판정' },
];

type Draft = { title: string; content: string; updated_at: string };

export default function GuidelinesPage() {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/guidelines')
      .then((r) => r.json())
      .then((rows: Guideline[]) => {
        const map: Record<string, Draft> = {};
        rows.forEach((g) => {
          map[g.key] = { title: g.title, content: g.content, updated_at: g.updated_at };
        });
        setDrafts(map);
      });
  }, []);

  const update = (key: string, field: 'title' | 'content', value: string) => {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));
    setSaved((s) => ({ ...s, [key]: false }));
  };

  const save = async (key: string) => {
    const draft = drafts[key];
    if (!draft?.title.trim() || !draft?.content.trim()) return;

    setSaving((s) => ({ ...s, [key]: true }));
    const res = await fetch(`/api/guidelines/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draft.title, content: draft.content }),
    });
    setSaving((s) => ({ ...s, [key]: false }));

    if (res.ok) {
      const row: Guideline = await res.json();
      setDrafts((d) => ({
        ...d,
        [key]: { title: row.title, content: row.content, updated_at: row.updated_at },
      }));
      setSaved((s) => ({ ...s, [key]: true }));
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">가이드라인 관리</h1>
        <p className="text-sm text-[#555] mt-1">
          관점별 심사 지침을 편집합니다. 저장하면 다음 분석부터 반영됩니다.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ key, header }) => {
          const draft = drafts[key];
          const empty = !draft?.title.trim() || !draft?.content.trim();
          return (
            <div key={key} className="bg-white border border-[#e5e5e5] rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#0a0a0a]">{header}</h2>
                <span className="text-xs font-mono text-[#ccc]">{key}</span>
              </div>

              <label className="block text-xs text-[#999] mb-1">제목</label>
              <input
                type="text"
                value={draft?.title ?? ''}
                onChange={(e) => update(key, 'title', e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a0a0a] bg-white transition-colors mb-3"
              />

              <label className="block text-xs text-[#999] mb-1">본문</label>
              <textarea
                rows={4}
                value={draft?.content ?? ''}
                onChange={(e) => update(key, 'content', e.target.value)}
                className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a0a0a] bg-white resize-none transition-colors"
              />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-[#999]">
                  {empty ? (
                    <span className="text-red-600">제목과 본문을 모두 입력하세요.</span>
                  ) : draft?.updated_at ? (
                    `최종 수정: ${draft.updated_at}`
                  ) : null}
                </span>
                <Button onClick={() => save(key)} disabled={saving[key] || empty}>
                  {saved[key] ? '저장됨' : saving[key] ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
