'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CreateAnalysisResponse, MerchantListItem } from '@/types';

type Mode = 'new' | 'existing';

const inputClass =
  'w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a0a0a] bg-white transition-colors';
const labelClass = 'block text-xs font-medium text-[#555] mb-1.5';

export default function NewAnalysisPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    business_number: '',
    representative: '',
    category: '',
    address: '',
    submitted_docs: '',
  });

  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== 'existing' || merchants.length > 0) return;
    setMerchantsLoading(true);
    fetch('/api/merchants')
      .then((res) => res.json())
      .then((data: { merchants: MerchantListItem[] }) => setMerchants(data.merchants))
      .catch(() => setError('가맹점 목록을 불러오지 못했습니다.'))
      .finally(() => setMerchantsLoading(false));
  }, [mode, merchants.length]);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const bnDigits = form.business_number.replace(/\D/g, '');
  const bnHint = form.business_number.trim().length > 0 && bnDigits.length !== 10;

  const submit = async (body: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '분석 생성에 실패했습니다.');
        return;
      }
      const { analysisId }: CreateAnalysisResponse = await res.json();
      router.push(`/analyses/${analysisId}`);
    } catch {
      setError('분석 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.business_number.trim() || !form.category.trim()) {
      setError('상호명·사업자번호·업종을 입력하세요.');
      return;
    }
    submit(form);
  };

  const handleReuse = () => {
    if (selectedId == null) {
      setError('재심사할 가맹점을 선택하세요.');
      return;
    }
    submit({ merchant_id: selectedId });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-2">새 분석</h1>
      <p className="text-sm text-[#555] mb-6">
        신규 가맹점을 입력하거나 기존 가맹점을 선택해 분석을 생성합니다.
      </p>

      <div className="inline-flex gap-1 bg-[#eee] rounded-md p-1 mb-6">
        <button
          type="button"
          onClick={() => { setMode('new'); setError(null); }}
          className={clsx(
            'text-sm px-4 py-1.5 rounded font-medium transition-colors',
            mode === 'new' ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#777] hover:text-[#0a0a0a]',
          )}
        >
          신규 입력
        </button>
        <button
          type="button"
          onClick={() => { setMode('existing'); setError(null); }}
          className={clsx(
            'text-sm px-4 py-1.5 rounded font-medium transition-colors',
            mode === 'existing' ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#777] hover:text-[#0a0a0a]',
          )}
        >
          기존 가맹점 선택
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {mode === 'new' ? (
        <form onSubmit={handleCreate} className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-5">
          <div>
            <label className={labelClass}>상호명 *</label>
            <input value={form.name} onChange={set('name')} placeholder="예) 주식회사 한국결제" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>사업자등록번호 *</label>
            <input
              value={form.business_number}
              onChange={set('business_number')}
              placeholder="000-00-00000"
              className={`${inputClass} font-mono`}
            />
            {bnHint && (
              <p className="mt-1.5 text-xs text-yellow-700">
                사업자번호는 보통 숫자 10자리입니다. 입력값을 확인하세요. (그대로 저장할 수 있습니다)
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>대표자명</label>
            <input value={form.representative} onChange={set('representative')} placeholder="예) 홍길동" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>업종 *</label>
            <input
              value={form.category}
              onChange={set('category')}
              placeholder="예) 전자상거래, 음식점업, 소프트웨어 개발"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>사업장 주소</label>
            <input
              value={form.address}
              onChange={set('address')}
              placeholder="예) 서울특별시 강남구 테헤란로 152"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>제출 서류 및 정보</label>
            <textarea
              value={form.submitted_docs}
              onChange={set('submitted_docs')}
              rows={6}
              placeholder="제출된 서류 내용, 신청서, 통화 내용 등 참고 정보를 자유롭게 붙여넣으세요."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={loading}>
              {loading ? '생성 중...' : '분석 생성'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-4">
          {merchantsLoading ? (
            <p className="text-sm text-[#777]">가맹점 목록을 불러오는 중...</p>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-[#777]">등록된 가맹점이 없습니다. 신규 입력 탭에서 먼저 등록하세요.</p>
          ) : (
            <div className="space-y-2">
              {merchants.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSelectedId(m.id); setError(null); }}
                  className={clsx(
                    'w-full text-left border rounded-md px-3 py-2.5 transition-colors',
                    selectedId === m.id
                      ? 'border-[#0a0a0a] bg-[#fafafa]'
                      : 'border-[#e5e5e5] hover:border-[#bbb]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#0a0a0a]">{m.name}</span>
                    <Badge color="gray">{m.category}</Badge>
                  </div>
                  <div className="text-xs font-mono text-[#888] mt-0.5">{m.business_number}</div>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button type="button" onClick={handleReuse} disabled={loading || selectedId == null}>
              {loading ? '생성 중...' : '이 가맹점으로 분석 생성'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
