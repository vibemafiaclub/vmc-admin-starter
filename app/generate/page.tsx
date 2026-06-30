'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { DocumentType, Inquiry } from '@/types/index';

const DOC_TYPES: DocumentType[] = ['이메일', '제안서', 'PRD', '슬라이드'];

function extractJSX(output: string): string | null {
  const match = output.match(/```(?:jsx|tsx)?([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

export default function GeneratePage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<string>('');
  const [docType, setDocType] = useState<DocumentType>('이메일');
  const [context, setContext] = useState<string>('');
  const [streaming, setStreaming] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    fetch('/api/inquiries')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setInquiries(data);
      })
      .catch(() => {
        /* 문의 목록은 선택사항 */
      });
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const extractedJSX = useMemo(() => {
    if (docType !== '슬라이드') return null;
    return extractJSX(output);
  }, [docType, output]);

  async function handleGenerate() {
    setStreaming(true);
    setOutput('');
    setError(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiry_id: selectedInquiry || undefined,
          type: docType,
          context: context || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const message = await res.text().catch(() => '');
        throw new Error(message || `요청 실패 (${res.status})`);
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
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const json = line.slice('data:'.length).trim();
          if (!json) continue;

          try {
            const payload = JSON.parse(json) as {
              chunk?: string;
              done?: boolean;
              content?: string;
              error?: string;
            };

            if (payload.error) {
              setError(payload.error);
            } else if (payload.chunk) {
              setOutput((prev) => prev + payload.chunk);
            } else if (payload.done && typeof payload.content === 'string') {
              setOutput(payload.content);
            }
          } catch {
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-2rem)] gap-4 p-6">
      <aside className="w-80 shrink-0">
        <Card className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">AI 문서 생성</h2>
            <p className="mt-1 text-xs text-gray-500">
              문의를 연결하고 유형을 선택해 문서를 생성합니다.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">문서 유형</h3>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDocType(t)}
                  className={
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors ' +
                    (docType === t
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              연결된 문의 <span className="font-normal text-gray-400">(선택)</span>
            </h3>
            <select
              value={selectedInquiry}
              onChange={(e) => setSelectedInquiry(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">연결 안 함</option>
              {inquiries.map((inq) => (
                <option key={inq.id} value={inq.id}>
                  {inq.company} ({inq.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">추가 컨텍스트</h3>
            <textarea
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="문서에 반영할 추가 정보를 입력하세요."
              className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <Button
            variant="primary"
            className="w-full"
            disabled={streaming}
            onClick={handleGenerate}
          >
            {streaming ? '생성 중…' : '생성'}
          </Button>
        </Card>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card title="생성 결과" className="flex min-h-0 flex-1 flex-col">
          {!output && !streaming ? (
            <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-400">
              옵션을 선택하고 생성을 눌러보세요.
            </div>
          ) : (
            <pre
              ref={outputRef}
              className="min-h-[16rem] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md bg-gray-900 p-4 font-mono text-xs leading-relaxed text-gray-100"
            >
              {output}
              {streaming && <span className="animate-pulse">▌</span>}
            </pre>
          )}
        </Card>

        {docType === '슬라이드' && extractedJSX && (
          <Card title="슬라이드 프리뷰" className="flex flex-col">
            <iframe
              title="슬라이드 프리뷰"
              className="h-96 w-full rounded-md border border-gray-200 bg-white"
              srcDoc={`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${extractedJSX}</body></html>`}
            />
          </Card>
        )}
      </main>
    </div>
  );
}
