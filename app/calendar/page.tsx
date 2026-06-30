'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { CalendarEvent, EventType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const eventPillColor: Record<EventType, string> = {
  교육: 'bg-blue-500',
  미팅: 'bg-emerald-500',
  콜: 'bg-amber-400',
  기타: 'bg-gray-300',
};

const eventBadgeColor: Record<EventType, 'blue' | 'green' | 'yellow' | 'gray'> = {
  교육: 'blue',
  미팅: 'green',
  콜: 'yellow',
  기타: 'gray',
};

function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
}

function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  const d = new Date(year, monthIndex + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface DayCell {
  date: string | null;
  day: number | null;
}

function buildCalendarGrid(month: string): DayCell[] {
  const { year, monthIndex } = parseMonth(month);
  const firstWeekday = new Date(year, monthIndex, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: null, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d });
  }
  // 마지막 주 행 채우기
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }
  return cells;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<string>(currentMonthString());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/events?month=${currentMonth}`)
      .then((res) => {
        if (!res.ok) throw new Error(`이벤트를 불러오지 못했습니다 (${res.status})`);
        return res.json();
      })
      .then((data: CalendarEvent[]) => {
        if (active) setEvents(Array.isArray(data) ? data : []);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentMonth]);

  const today = todayString();
  const cells = buildCalendarGrid(currentMonth);
  const { year, monthIndex } = parseMonth(currentMonth);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">캘린더</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label="이전 달"
            onClick={() => setCurrentMonth((m) => shiftMonth(m, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center text-base font-semibold text-gray-800">
            {year}년 {monthIndex + 1}월
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="다음 달"
            onClick={() => setCurrentMonth((m) => shiftMonth(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              className={clsx(
                'py-2 text-center text-xs font-medium',
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500',
              )}
            >
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const isToday = cell.date === today;
            const dayEvents = cell.date ? eventsByDate.get(cell.date) ?? [] : [];
            const extra = dayEvents.length - 3;

            return (
              <div
                key={idx}
                className={clsx(
                  'min-h-24 border-r border-b border-gray-200 p-1',
                  idx % 7 === 6 && 'border-r-0',
                  cell.date
                    ? isToday
                      ? 'border-indigo-200 bg-indigo-50'
                      : 'bg-white hover:bg-gray-50'
                    : 'bg-gray-50/40',
                )}
              >
                {cell.date && (
                  <>
                    <div className="mb-1 flex justify-end">
                      {isToday ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                          {cell.day}
                        </span>
                      ) : (
                        <span className="px-1 text-xs font-medium text-gray-600">
                          {cell.day}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          title={ev.title}
                          className={clsx(
                            'block w-full truncate rounded px-1 text-left text-xs text-white',
                            eventPillColor[ev.type],
                          )}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {extra > 0 && (
                        <div className="px-1 text-xs text-gray-400">+{extra}개 더보기</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!loading && events.length === 0 && !error && (
        <p className="mt-4 text-sm text-gray-400">이번 달에 등록된 일정이 없습니다.</p>
      )}

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

interface EventDetailPanelProps {
  event: CalendarEvent;
  onClose: () => void;
}

function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/30"
      />
      <div className="absolute top-0 right-0 flex h-full w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-gray-200 p-5">
          <div className="pr-4">
            <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
            <div className="mt-2">
              <Badge label={event.type} color={eventBadgeColor[event.type]} />
            </div>
          </div>
          <Button variant="ghost" size="sm" aria-label="닫기" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <DetailRow icon={<CalendarIcon className="h-4 w-4 text-gray-400" />} label="날짜">
            {event.date}
          </DetailRow>
          <DetailRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="시간">
            {event.time ? `${event.time} · ${event.duration_minutes}분` : `${event.duration_minutes}분`}
          </DetailRow>
          <DetailRow icon={<MapPin className="h-4 w-4 text-gray-400" />} label="장소">
            {event.location ?? '미정'}
          </DetailRow>
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function DetailRow({ icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs font-medium text-gray-400">{label}</div>
        <div className="text-sm text-gray-700">{children}</div>
      </div>
    </div>
  );
}
