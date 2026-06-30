'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function NewAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    business_number: '',
    category: '',
    address: '',
    submitted_docs: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const { analysisId } = await res.json();
    router.push(`/analyses/${analysisId}`);
  };

  const inputClass = 'w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0a0a0a] bg-white transition-colors';
  const labelClass = 'block text-xs font-medium text-[#555] mb-1.5';

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-[#0a0a0a] mb-6">신규 가맹점 분석</h1>
      <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-5">
        <div>
          <label className={labelClass}>상호명 *</label>
          <input
            value={form.name}
            onChange={set('name')}
            required
            placeholder="예) 주식회사 한국결제"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>사업자등록번호 *</label>
          <input
            value={form.business_number}
            onChange={set('business_number')}
            required
            placeholder="000-00-00000"
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>업종 *</label>
          <input
            value={form.category}
            onChange={set('category')}
            required
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
            placeholder="제출된 서류 내용, 가맹점 측 설명, 기타 참고 정보를 자유롭게 입력하세요."
            className={`${inputClass} resize-none`}
          />
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? '등록 중...' : '분석 등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}
