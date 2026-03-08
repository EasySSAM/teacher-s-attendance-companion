import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, Type1, Type2, TYPE1_OPTIONS, TYPE2_OPTIONS, PERIOD_LABELS } from '@/types/attendance';
import { XIcon, AlertIcon } from './Icons';
import { getMaxPeriod, getAllPeriods, getRequiredDocs, getDayName, generateId } from '@/utils/attendance';
import { DaySchedule } from '@/types/attendance';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  record?: AttendanceRecord | null;
  currentDate: string;
  schedule: DaySchedule;
  records: AttendanceRecord[];
  onSave: (record: AttendanceRecord) => void;
  onUpdate: (id: string, updates: Partial<AttendanceRecord>) => void;
  frequentReasons: string[];
  warningPhrases: string[];
}

export default function AttendanceModal({
  isOpen,
  onClose,
  students,
  record,
  currentDate,
  schedule,
  records,
  onSave,
  onUpdate,
  frequentReasons,
  warningPhrases,
}: AttendanceModalProps) {
  const [date, setDate] = useState(currentDate);
  const [studentId, setStudentId] = useState('');
  const [type1, setType1] = useState<Type1>('질병');
  const [type2, setType2] = useState<Type2>('결석');
  const [reason, setReason] = useState('');
  const [periods, setPeriods] = useState<number[]>([]);
  const [submittedDocs, setSubmittedDocs] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isEdit = !!record;

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setStudentId(record.studentId);
      setType1(record.type1);
      setType2(record.type2);
      setReason(record.reason);
      setPeriods(record.periods);
      setSubmittedDocs(record.submittedDocs);
    } else {
      setDate(currentDate);
      setStudentId(students[0]?.id || '');
      setType1('질병');
      setType2('결석');
      setReason('');
      setPeriods([]);
      setSubmittedDocs([]);
    }
  }, [record, currentDate, students, isOpen]);

  const maxPeriod = getMaxPeriod(date, schedule);
  const availablePeriods = useMemo(() => {
    const p = [0];
    for (let i = 1; i <= maxPeriod; i++) p.push(i);
    p.push(11);
    return p;
  }, [maxPeriod]);

  // Auto-logic for type1/type2 changes
  useEffect(() => {
    if (type1 === '미인정') {
      setReason('미인정');
    }
  }, [type1]);

  useEffect(() => {
    if (type2 === '결석') {
      setPeriods(availablePeriods);
    }
  }, [type2, availablePeriods]);

  const handlePeriodClick = (p: number) => {
    if (type2 === '결석') return;
    
    if (type2 === '조퇴') {
      // From clicked to end
      const idx = availablePeriods.indexOf(p);
      setPeriods(availablePeriods.slice(idx));
    } else if (type2 === '지각') {
      // From start to clicked
      const idx = availablePeriods.indexOf(p);
      setPeriods(availablePeriods.slice(0, idx + 1));
    } else {
      // Toggle for 결과
      setPeriods(prev =>
        prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a, b) => a - b)
      );
    }
  };

  const requiredDocs = getRequiredDocs(type1, type2, reason);

  const toggleDoc = (doc: string) => {
    setSubmittedDocs(prev =>
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    );
  };

  // Warning: same reason in same month
  const warningMessage = useMemo(() => {
    if (!reason || !studentId || !date) return '';
    const month = date.slice(0, 7);
    const existing = records.filter(
      r => r.studentId === studentId && r.date.startsWith(month) && r.reason === reason && r.id !== record?.id
    );
    if (existing.length > 0) {
      return `이번 달에 같은 사유("${reason}")로 ${existing.length}건의 기록이 있습니다.`;
    }
    return '';
  }, [reason, studentId, date, records, record]);

  const filteredSuggestions = useMemo(() => {
    if (!reason || reason.length === 0) return [];
    return frequentReasons.filter(r => r.includes(reason) && r !== reason);
  }, [reason, frequentReasons]);

  const handleSave = () => {
    if (!studentId) return;
    const data: AttendanceRecord = {
      id: record?.id || generateId(),
      studentId,
      date,
      type1,
      type2,
      reason,
      periods,
      requiredDocs,
      submittedDocs,
    };

    if (isEdit) {
      onUpdate(record!.id, data);
    } else {
      onSave(data);
    }
    onClose();
  };

  if (!isOpen) return null;

  const type1Colors: Record<Type1, string> = {
    '출석인정': 'bg-att-approved-bg text-att-approved border-att-approved/30',
    '질병': 'bg-att-sick-bg text-att-sick border-att-sick/30',
    '미인정': 'bg-att-unexcused-bg text-att-unexcused border-att-unexcused/30',
    '기타': 'bg-att-other-bg text-att-other border-att-other/30',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{isEdit ? '출결 수정' : '출결 입력'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><XIcon /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-input bg-background text-foreground"
            />
          </div>

          {/* Student */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">학생</label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full p-3 rounded-xl border border-input bg-background text-foreground"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.number}번 {s.name}</option>
              ))}
            </select>
          </div>

          {/* Type 1 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">구분 1</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE1_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setType1(t)}
                  className={`py-2 px-1 rounded-xl text-sm font-medium border transition-all ${
                    type1 === t ? type1Colors[t] + ' ring-2 ring-offset-1 ring-primary/30' : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Type 2 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">구분 2</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE2_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => { setType2(t); }}
                  className={`py-2 px-1 rounded-xl text-sm font-medium border transition-all ${
                    type2 === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="relative">
            <label className="block text-sm font-medium text-muted-foreground mb-1">사유</label>
            <input
              type="text"
              value={reason}
              onChange={e => { setReason(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="사유를 입력하세요"
              className="w-full p-3 rounded-xl border border-input bg-background text-foreground"
              disabled={type1 === '미인정'}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {filteredSuggestions.slice(0, 5).map(s => (
                  <button
                    key={s}
                    onMouseDown={() => { setReason(s); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {warningMessage && (
              <div className="flex items-center gap-1.5 mt-2 text-att-unexcused text-xs">
                <AlertIcon className="w-3.5 h-3.5" />
                {warningMessage}
              </div>
            )}
          </div>

          {/* Periods */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">교시 선택</label>
            <div className="flex flex-wrap gap-2">
              {availablePeriods.map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodClick(p)}
                  disabled={type2 === '결석'}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    periods.includes(p)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-transparent'
                  } ${type2 === '결석' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Required docs */}
          {requiredDocs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">필요 서류</label>
              <div className="space-y-2">
                {requiredDocs.map(doc => (
                  <label key={doc} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submittedDocs.includes(doc)}
                      onChange={() => toggleDoc(doc)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-base shadow-lg hover:opacity-90 transition-opacity"
          >
            {isEdit ? '수정하기' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
