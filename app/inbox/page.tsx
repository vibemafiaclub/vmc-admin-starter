'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  ChevronRight,
  AlertCircle,
  Minus,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Email, EmailChat } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const priorityConfig: Record<
  string,
  { label: string; color: 'blue' | 'green' | 'yellow' | 'gray'; Icon: React.ElementType }
> = {
  high: { label: '중요', color: 'blue', Icon: AlertCircle },
  normal: { label: '보통', color: 'gray', Icon: Minus },
  low: { label: '낮음', color: 'green', Icon: Minus },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface EmailDetailProps {
  email: Email;
  chats: EmailChat[];
  onChatsUpdate: (chats: EmailChat[]) => void;
  onEmailUpdate: (email: Email) => void;
}

function EmailDetail({ email, chats, onChatsUpdate, onEmailUpdate }: EmailDetailProps) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingDraftId, setPendingDraftId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInput('');
    setStreaming(false);
    setStreamingContent('');
    setPendingDraftId(null);
    setShowFeedback(false);
    setFeedbackText('');
  }, [email.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, streamingContent]);

  const sendMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim() || streaming) return;
      setInput('');
      setStreamingContent('');
      setStreaming(true);
      setPendingDraftId(null);
      setShowFeedback(false);

      const optimisticUser: EmailChat = {
        id: Date.now(),
        email_id: email.id,
        role: 'user',
        content: msg,
        created_at: new Date().toISOString(),
        is_draft: 0,
      };
      onChatsUpdate([...chats, optimisticUser]);

      try {
        const res = await fetch(`/api/emails/${email.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let full = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = JSON.parse(line.slice(6)) as {
              chunk?: string;
              done?: boolean;
              chat_id?: number;
              error?: string;
            };
            if (payload.chunk) {
              full += payload.chunk;
              setStreamingContent(full);
            }
            if (payload.done && payload.chat_id) {
              const aiMsg: EmailChat = {
                id: payload.chat_id as number,
                email_id: email.id,
                role: 'assistant',
                content: full,
                created_at: new Date().toISOString(),
                is_draft: 1,
              };
              onChatsUpdate([...chats, optimisticUser, aiMsg]);
              setStreamingContent('');
              setPendingDraftId(payload.chat_id as number);
            }
          }
        }
      } catch {
        /* 스트림 중단 시 누적분 유지 */
      } finally {
        setStreaming(false);
      }
    },
    [email.id, chats, streaming, onChatsUpdate],
  );

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApprove = async () => {
    const res = await fetch(`/api/emails/${email.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    const updated = (await res.json()) as Email;
    onEmailUpdate(updated);
    setPendingDraftId(null);
  };

  const handleReject = () => {
    setPendingDraftId(null);
    setShowFeedback(true);
  };

  const handleFeedbackSend = () => {
    const msg = `다음 피드백을 반영해서 답신 초안을 다시 작성해줘: ${feedbackText}`;
    setFeedbackText('');
    setShowFeedback(false);
    sendMessage(msg);
  };

  const isReplied = email.is_replied === 1;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-1 flex items-start gap-2">
          {isReplied && (
            <Badge label="회신 완료" color="green" />
          )}
          <Badge label={priorityConfig[email.priority]?.label ?? email.priority} color={priorityConfig[email.priority]?.color ?? 'gray'} />
        </div>
        <h2 className="mt-2 text-base font-semibold text-gray-900">{email.subject}</h2>
        <div className="mt-1 text-xs text-gray-500">
          <span className="font-medium">{email.sender_name}</span>
          {email.sender_email && <span> &lt;{email.sender_email}&gt;</span>}
          <span className="ml-3">{formatDateTime(email.received_at)}</span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
          {email.body ?? ''}
        </pre>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-6 py-2">
          <span className="text-xs font-medium text-gray-400">AI 답신 어시스턴트</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {chats.length === 0 && !streaming && (
            <p className="text-center text-sm text-gray-400">
              메일에 대해 물어보거나 답신을 요청하세요.
            </p>
          )}
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={clsx('flex', chat.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={clsx(
                  'max-w-[85%] rounded-lg px-4 py-3 text-sm',
                  chat.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-800',
                )}
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{chat.content}</pre>
              </div>
            </div>
          ))}

          {streaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                  {streamingContent}
                </pre>
              </div>
            </div>
          )}
          {streaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400">
                작성 중...
              </div>
            </div>
          )}

          {pendingDraftId && !streaming && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="flex-1 text-sm text-amber-800">
                초안이 준비됐어요. 발신할까요?
              </span>
              <button
                type="button"
                onClick={handleApprove}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                발신
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                수정 요청
              </button>
            </div>
          )}

          {showFeedback && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500">어떻게 고칠지 알려주세요.</p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="예: 좀 더 간결하게, 일정 관련 내용 강조..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowFeedback(false)}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleFeedbackSend}
                  disabled={!feedbackText.trim()}
                >
                  피드백 전송
                </Button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-200 bg-white px-6 py-4">
          {isReplied && (
            <p className="mb-2 text-xs text-green-600">
              회신 완료된 메일이에요.
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={streaming}
              placeholder="답신 작성을 요청하거나 질문하세요"
              className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="flex h-full items-center justify-center rounded-md bg-indigo-600 px-4 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailEmail, setDetailEmail] = useState<Email | null>(null);
  const [chats, setChats] = useState<EmailChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/emails')
      .then((r) => r.json())
      .then((data: Email[]) => {
        setEmails(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const selectEmail = useCallback(async (email: Email) => {
    setSelectedId(email.id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/emails/${email.id}`);
      const data = (await res.json()) as { email: Email; chats: EmailChat[] };
      setDetailEmail(data.email);
      setChats(data.chats);
    } catch {
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleEmailUpdate = useCallback(
    (updated: Email) => {
      setDetailEmail(updated);
      setEmails((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, is_replied: updated.is_replied, draft_status: updated.draft_status } : e)),
      );
    },
    [],
  );

  return (
    <div className="-m-6 flex h-screen">
      <div
        className={clsx(
          'flex flex-col border-r border-gray-200 bg-white',
          selectedId ? 'w-80 shrink-0' : 'flex-1',
        )}
      >
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <h1 className="text-base font-semibold text-gray-900">수신 메일</h1>
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {emails.filter((e) => !e.is_replied).length} 미회신
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
            불러오는 중...
          </div>
        )}
        {error && (
          <div className="m-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {emails.map((email) => {
            const isSelected = email.id === selectedId;
            const pc = priorityConfig[email.priority];
            const PIcon = pc?.Icon ?? Minus;
            return (
              <button
                key={email.id}
                type="button"
                onClick={() => selectEmail(email)}
                className={clsx(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  isSelected
                    ? 'bg-indigo-50'
                    : email.is_replied
                    ? 'hover:bg-gray-50'
                    : 'bg-white hover:bg-gray-50',
                )}
              >
                <div className={clsx('mt-0.5 shrink-0', pc?.color === 'blue' ? 'text-blue-500' : 'text-gray-300')}>
                  <PIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'truncate text-xs font-medium',
                        email.is_replied ? 'text-gray-400' : 'text-gray-800',
                      )}
                    >
                      {email.sender_name ?? email.sender_email}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-gray-400">
                      {formatDate(email.received_at)}
                    </span>
                  </div>
                  <p
                    className={clsx(
                      'mt-0.5 truncate text-xs',
                      email.is_replied ? 'text-gray-400' : 'text-gray-600',
                      !email.is_replied && 'font-medium',
                    )}
                  >
                    {email.subject}
                  </p>
                  {!email.is_replied && (
                    <span className="mt-1 inline-block rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      미회신
                    </span>
                  )}
                </div>
                {isSelected && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-indigo-400" />}
              </button>
            );
          })}
          {!loading && emails.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">수신된 메일이 없습니다.</p>
          )}
        </div>
      </div>

      {selectedId && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {detailLoading || !detailEmail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : (
            <EmailDetail
              email={detailEmail}
              chats={chats}
              onChatsUpdate={setChats}
              onEmailUpdate={handleEmailUpdate}
            />
          )}
        </div>
      )}

      {!selectedId && !loading && emails.length > 0 && (
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div className="text-center text-gray-400">
            <Mail className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">메일을 선택하세요</p>
          </div>
        </div>
      )}
    </div>
  );
}
