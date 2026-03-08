import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, DaySchedule, PERIOD_LABELS } from '@/types/attendance';
import { formatDate, addDaysSkipWeekend, getType1Color, formatPeriods, getTodayStr, getMaxPeriod, toDateStr } from '@/utils/attendance';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, EditIcon } from './Icons';
import { RotateCcw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AttendanceModal from './AttendanceModal';

interface DailyViewProps {
  students: Student[];
  records: AttendanceRecord[];
  schedule: DaySchedule;
  getActiveStudents: (date: string) => Student[];
  getRecordsForDate: (date: string) => AttendanceRecord[];
  getFrequentReasons: () => string[];
  warningPhrases: string[];
  onAddRecord: (record: AttendanceRecord) => void;
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

const DAILY_CURRENT_DATE_KEY = 'daily_view_current_date';

export default function DailyView({
  students,
  records,
  schedule,
  getActiveStudents,
  getRecordsForDate,
  getFrequentReasons,
  warningPhrases,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
}: DailyViewProps) {
  const [currentDate, setCurrentDate] = useState(() => localStorage.getItem(DAILY_CURRENT_DATE_KEY) || getTodayStr());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(DAILY_CURRENT_DATE_KEY, currentDate);
  }, [currentDate]);

  const dayRecords = useMemo(() => getRecordsForDate(currentDate), [currentDate, getRecordsForDate]);
  const activeStudents = useMemo(() => getActiveStudents(currentDate), [currentDate, getActiveStudents]);
  const frequentReasons = useMemo(() => getFrequentReasons(), [getFrequentReasons]);

  const maxPeriod = getMaxPeriod(currentDate, schedule);
  const availablePeriods = useMemo(() => {
    const p = [0];
    for (let i = 1; i <= maxPeriod; i++) p.push(i);
    p.push(11);
    return p;
  }, [maxPeriod]);

  const filteredRecords = useMemo(() => {
    const recs = selectedPeriod === null ? dayRecords : dayRecords.filter(r => r.periods.includes(selectedPeriod));
    return recs.sort((a, b) => {
      const sA = students.find(s => s.id === a.studentId);
      const sB = students.find(s => s.id === b.studentId);
      return (sA?.number || 0) - (sB?.number || 0);
    });
  }, [dayRecords, selectedPeriod, students]);

  const changedCount = dayRecords.length;

  const getStudent = (id: string) => students.find(s => s.id === id);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('이 출결 기록을 삭제하시겠습니까?')) {
      onDeleteRecord(id);
    }
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditRecord(null);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(addDaysSkipWeekend(currentDate, -1))}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronLeftIcon />
          </button>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                  {formatDate(currentDate)}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={new Date(currentDate + 'T00:00:00')}
                  onSelect={(day) => {
                    if (day) setCurrentDate(toDateStr(day));
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {currentDate !== getTodayStr() && (
              <button
                onClick={() => setCurrentDate(getTodayStr())}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                오늘로
              </button>
            )}
          </div>
          <button
            onClick={() => setCurrentDate(addDaysSkipWeekend(currentDate, 1))}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronRightIcon />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide">
          {selectedPeriod !== null && (
            <button
              onClick={() => setSelectedPeriod(null)}
              className="shrink-0 p-1.5 rounded-full bg-primary text-primary-foreground transition-colors"
              title="기본 보기로 돌아가기"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => setSelectedPeriod(null)}
            className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              selectedPeriod === null
                ? (changedCount > 0 ? 'bg-att-unexcused-bg text-att-unexcused' : 'bg-att-other-bg text-att-other')
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {changedCount > 0 ? `${changedCount}명 변동` : '전원출석'}
          </button>
          <div className="h-4 w-px bg-border shrink-0" />
          {availablePeriods.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(selectedPeriod === p ? null : p)}
              className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full transition-colors ${
                selectedPeriod === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="text-5xl mb-3">✨</div>
            <p className="font-medium">{selectedPeriod !== null ? '해당 교시에 변동이 없습니다' : '전원 출석입니다'}</p>
            <p className="text-sm mt-1">{selectedPeriod !== null ? '다른 교시를 선택해보세요' : '출결 변동이 없습니다'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredRecords.map(record => {
              const student = getStudent(record.studentId);
              if (!student) return null;
              const colors = getType1Color(record.type1);
              const hasWarning = !record.reason || record.periods.length === 0;

              return (
                <div
                  key={record.id}
                  className={`relative bg-card border border-border rounded-2xl p-3 shadow-sm`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap flex-1">
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium ${
                        student.gender === 'male'
                          ? 'bg-gender-male text-gender-male-text'
                          : 'bg-gender-female text-gender-female-text'
                      }`}>
                        {student.number}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate">{student.name}</span>
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {record.type1}{record.type2}
                      </span>
                    </div>
                    <div className="flex items-start shrink-0">
                      <button
                        onClick={() => openEdit(record)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <EditIcon className="w-3.5 h-3.5 opacity-40" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, record.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5 text-destructive opacity-60" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {record.periods.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                        {formatPeriods(record.periods)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-att-unexcused-bg text-att-unexcused">
                        ⚠ 교시 미선택
                      </span>
                    )}
                    {record.reason ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                        {record.reason}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-att-unexcused-bg text-att-unexcused">
                        ⚠ 사유 미입력
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-40"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Modal */}
      <AttendanceModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        students={activeStudents}
        record={editRecord}
        currentDate={currentDate}
        schedule={schedule}
        records={records}
        onSave={onAddRecord}
        onUpdate={onUpdateRecord}
        frequentReasons={frequentReasons}
        warningPhrases={warningPhrases}
      />
    </div>
  );
}
