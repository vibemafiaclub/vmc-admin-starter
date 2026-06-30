'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Inquiry, InquiryStatus, BadgeColor } from '@/types/index';

type ViewMode = 'kanban' | 'table' | 'card';

const STATUS_COLUMNS: { key: InquiryStatus; label: string }[] = [
  { key: 'received', label: '회신 대기' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'completed', label: '완료' },
  { key: 'closed', label: '종료' },
];

const STATUS_LABEL: Record<InquiryStatus, string> = {
  received: '회신 대기',
  in_progress: '진행 중',
  completed: '완료',
  closed: '종료',
};

const STATUS_COLOR: Record<InquiryStatus, BadgeColor> = {
  received: 'gray',
  in_progress: 'blue',
  completed: 'green',
  closed: 'slate',
};

const CATEGORY_COLOR: Record<string, BadgeColor> = {
  B2B교육: 'purple',
  AX컨설팅: 'orange',
  강연의뢰: 'teal',
  브랜디드콘텐츠협업: 'pink',
  기타: 'gray',
};

function categoryColor(category: string): BadgeColor {
  return CATEGORY_COLOR[category] ?? 'gray';
}

const CATEGORY_OPTIONS = [
  'B2B교육',
  'AX컨설팅',
  '강연의뢰',
  '브랜디드콘텐츠협업',
  '기타',
];

function formatValue(value: number): string {
  if (!value) return '-';
  return `${(value / 10000).toLocaleString('ko-KR')}만원`;
}

function formatDate(date: string | null): string {
  return date ?? '-';
}

function KanbanCard({ inquiry }: { inquiry: Inquiry }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: inquiry.id,
    data: { status: inquiry.status },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={
        'rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing select-none touch-none ' +
        (isDragging ? 'opacity-40' : 'hover:shadow-md transition-shadow')
      }
    >
      <CardBody inquiry={inquiry} />
    </div>
  );
}

function CardBody({ inquiry }: { inquiry: Inquiry }) {
  return (
    <>
      <div className="text-sm font-semibold text-gray-800 mb-2">
        {inquiry.company}
      </div>
      <div className="mb-2">
        <Badge label={inquiry.category} color={categoryColor(inquiry.category)} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-medium text-gray-700">
          {formatValue(inquiry.estimated_value)}
        </span>
        <span>{formatDate(inquiry.received_at)}</span>
      </div>
    </>
  );
}

function KanbanColumn({
  status,
  label,
  inquiries,
}: {
  status: InquiryStatus;
  label: string;
  inquiries: Inquiry[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="flex items-center gap-2 px-1 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
        <Badge label={String(inquiries.length)} color={STATUS_COLOR[status]} />
      </div>
      <div
        ref={setNodeRef}
        className={
          'flex flex-col gap-2 rounded-lg p-2 min-h-[120px] flex-1 transition-colors ' +
          (isOver ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-gray-100')
        }
      >
        {inquiries.map((inq) => (
          <KanbanCard key={inq.id} inquiry={inq} />
        ))}
        {inquiries.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-6">
            문의 없음
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey =
  | 'id'
  | 'company'
  | 'category'
  | 'status'
  | 'estimated_value'
  | 'assignee'
  | 'received_at';

const TABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'company', label: '회사' },
  { key: 'category', label: '카테고리' },
  { key: 'status', label: '상태' },
  { key: 'estimated_value', label: '파이프라인' },
  { key: 'assignee', label: '담당자' },
  { key: 'received_at', label: '수신일' },
];

function TableView({ inquiries }: { inquiries: Inquiry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('received_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const rows = [...inquiries];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'ko');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [inquiries, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-indigo-600">
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((inq) => (
              <tr
                key={inq.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {inq.id}
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {inq.company}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    label={inq.category}
                    color={categoryColor(inq.category)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    label={STATUS_LABEL[inq.status]}
                    color={STATUS_COLOR[inq.status]}
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {formatValue(inq.estimated_value)}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{inq.assignee}</td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {formatDate(inq.received_at)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  문의 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CardView({ inquiries }: { inquiries: Inquiry[] }) {
  if (inquiries.length === 0) {
    return (
      <div className="text-center text-gray-400 py-16">문의 없음</div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {inquiries.map((inq) => (
        <Card key={inq.id}>
          <div className="text-lg font-semibold text-gray-800 mb-2">
            {inq.company}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Badge label={inq.category} color={categoryColor(inq.category)} />
            <Badge
              label={STATUS_LABEL[inq.status]}
              color={STATUS_COLOR[inq.status]}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="font-medium text-gray-700">
              {formatValue(inq.estimated_value)}
            </span>
            <span className="text-gray-500">
              {formatDate(inq.received_at)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function BoardPage() {
  const [view, setView] = useState<ViewMode>('kanban');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        const qs = params.toString();
        const res = await fetch(`/api/inquiries${qs ? `?${qs}` : ''}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Inquiry[] = await res.json();
        if (!cancelled) setInquiries(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const map: Record<InquiryStatus, Inquiry[]> = {
      received: [],
      in_progress: [],
      completed: [],
      closed: [],
    };
    for (const inq of inquiries) {
      if (map[inq.status]) map[inq.status].push(inq);
    }
    return map;
  }, [inquiries]);

  const activeInquiry = useMemo(
    () => inquiries.find((i) => i.id === activeId) ?? null,
    [inquiries, activeId],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const inquiryId = String(active.id);
    const newStatus = over.id as InquiryStatus;
    const current = inquiries.find((i) => i.id === inquiryId);
    if (!current || current.status === newStatus) return;

    const previousStatus = current.status;

    setInquiries((prev) =>
      prev.map((i) =>
        i.id === inquiryId ? { ...i, status: newStatus } : i,
      ),
    );

    try {
      const res = await fetch(`/api/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Inquiry = await res.json();
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? updated : i)),
      );
    } catch {
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId ? { ...i, status: previousStatus } : i,
        ),
      );
    }
  }

  const VIEW_TABS: { key: ViewMode; label: string }[] = [
    { key: 'kanban', label: '칸반' },
    { key: 'table', label: '테이블' },
    { key: 'card', label: '카드' },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-800">협업 보드</h1>
          <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
            {VIEW_TABS.map((tab) => (
              <Button
                key={tab.key}
                variant={view === tab.key ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setView(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 상태</option>
            {STATUS_COLUMNS.map((s) => (
              <option key={s.key} value={s.key}>
                {STATUS_LABEL[s.key]}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">전체 카테고리</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400">
            {loading ? '불러오는 중…' : `${inquiries.length}건`}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          데이터를 불러오지 못했습니다: {error}
        </div>
      )}

      {view === 'kanban' && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {STATUS_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                status={col.key}
                label={col.label}
                inquiries={grouped[col.key]}
              />
            ))}
          </div>
          <DragOverlay>
            {activeInquiry ? (
              <div className="rounded-lg border border-indigo-300 bg-white p-3 shadow-lg w-64">
                <CardBody inquiry={activeInquiry} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {view === 'table' && <TableView inquiries={inquiries} />}

      {view === 'card' && <CardView inquiries={inquiries} />}
    </div>
  );
}
