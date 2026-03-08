import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, Type1, DaySchedule } from '@/types/attendance';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, EditIcon, TrashIcon } from './Icons';
import { formatDate, getType1Color, formatPeriods, getSchoolYear, getDayName, toDateStr } from '@/utils/attendance';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AttendanceModal from './AttendanceModal';

interface StatisticsProps {
  students: Student[];
  records: AttendanceRecord[];
  yearlyExcludeTypes: Type1[];
  schedule: DaySchedule;
  warningPhrases: string[];
  frequentReasons: string[];
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  onAddRecord: (record: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

type SubTab = 'docs' | 'monthly-date' | 'monthly-student' | 'yearly';

export default function Statistics({ students, records, yearlyExcludeTypes, schedule, warningPhrases, frequentReasons, onUpdateRecord, onAddRecord, onDeleteRecord }: StatisticsProps) {
  const [subTab, setSubTab] = useState<SubTab>('docs');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(getSchoolYear());
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const getStudent = (id: string) => students.find(s => s.id === id);

  const openEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 출결 기록을 삭제하시겠습니까?')) {
      onDeleteRecord(id);
    }
  };

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'docs', label: '서류미제출' },
    { key: 'monthly-date', label: '월별(일자)' },
    { key: 'monthly-student', label: '월별(학생)' },
    { key: 'yearly', label: '연간(누적)' },
  ];

  // Docs tab: records with missing docs
  const missingDocRecords = useMemo(() => {
    return records.filter(r => {
      if (r.requiredDocs.length === 0) return false;
      return r.requiredDocs.some(d => !r.submittedDocs.includes(d));
    });
  }, [records]);

  const toggleSubmittedDoc = (recordId: string, doc: string, currentSubmitted: string[]) => {
    const newDocs = currentSubmitted.includes(doc)
      ? currentSubmitted.filter(d => d !== doc)
      : [...currentSubmitted, doc];
    onUpdateRecord(recordId, { submittedDocs: newDocs });
  };

  // Monthly records
  const monthlyRecords = useMemo(() => {
    const prefix = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
    return records.filter(r => r.date.startsWith(prefix)).sort((a, b) => a.date.localeCompare(b.date));
  }, [records, selectedMonth]);

  // Yearly records (school year: March to February)
  const yearlyRecords = useMemo(() => {
    const startDate = `${selectedSchoolYear}-03-01`;
    const endDate = `${selectedSchoolYear + 1}-03-01`;
    return records.filter(r => r.date >= startDate && r.date < endDate && !yearlyExcludeTypes.includes(r.type1));
  }, [records, selectedSchoolYear, yearlyExcludeTypes]);

  // Yearly stats per student
  const yearlyStats = useMemo(() => {
    const stats: Record<string, { 결석: number; 지각: number; 조퇴: number; 결과: number }> = {};
    yearlyRecords.forEach(r => {
      if (!stats[r.studentId]) stats[r.studentId] = { 결석: 0, 지각: 0, 조퇴: 0, 결과: 0 };
      stats[r.studentId][r.type2]++;
    });
    return stats;
  }, [yearlyRecords]);

  const changeMonth = (dir: number) => {
    setSelectedMonth(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { year: y, month: m };
    });
  };

  // Shared record card component
  const RecordCard = ({ r, showDate = false, hideStudent = false }: { r: AttendanceRecord; showDate?: boolean; hideStudent?: boolean }) => {
    const student = getStudent(r.studentId);
    if (!student) return null;
    const colors = getType1Color(r.type1);
    if (hideStudent) {
      return (
        <div
          className="relative bg-card border border-border rounded-2xl p-2.5 shadow-sm"
        >
          <div className="flex items-start gap-1">
            <div className="flex-1 flex flex-wrap gap-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold truncate ${colors.bg} ${colors.text} border ${colors.border}`}>
              {r.type1}{r.type2}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground truncate">
              {r.date.slice(5)} ({getDayName(r.date)})
            </span>
            {r.periods.length > 0 ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground truncate">
                {formatPeriods(r.periods)}
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-att-unexcused-bg text-att-unexcused truncate">
                ⚠ 교시
              </span>
            )}
            {r.reason ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground truncate" title={r.reason}>
                {r.reason}
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-att-unexcused-bg text-att-unexcused truncate">
                ⚠ 사유
              </span>
            )}
            </div>
            <div className="flex items-start shrink-0">
              <button
                onClick={() => openEdit(r)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <EditIcon className="w-3 h-3 opacity-40" />
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-1 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <TrashIcon className="w-3 h-3 text-destructive opacity-60" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="relative bg-card border border-border rounded-2xl p-3 shadow-sm"
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
              {r.type1}{r.type2}
            </span>
          </div>
          <div className="flex items-start shrink-0">
            <button
              onClick={() => openEdit(r)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <EditIcon className="w-3.5 h-3.5 opacity-40" />
            </button>
            <button
              onClick={() => handleDelete(r.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5 text-destructive opacity-60" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {showDate && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
              {r.date.slice(5)} ({getDayName(r.date)})
            </span>
          )}
          {r.periods.length > 0 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
              {formatPeriods(r.periods)}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-att-unexcused-bg text-att-unexcused">
              ⚠ 교시
            </span>
          )}
          {r.reason ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground">
              {r.reason}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-att-unexcused-bg text-att-unexcused">
              ⚠ 사유
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub tabs - same style as Settings */}
      <div className="flex border-b border-border bg-card shrink-0">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              subTab === t.key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {t.label}
            {subTab === t.key && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Docs */}
        {subTab === 'docs' && (
          <div className="p-3">
            {missingDocRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-2">📄</div>
                <p className="font-medium">미제출 서류가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {missingDocRecords.map(r => {
                  const student = getStudent(r.studentId);
                  if (!student) return null;
                  const colors = getType1Color(r.type1);
                  return (
                    <div
                      key={r.id}
                      className="relative bg-card border border-border rounded-2xl p-3 shadow-sm"
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
                          {r.type1}{r.type2}
                        </span>
                        </div>
                        <div className="flex items-start shrink-0">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          >
                            <EditIcon className="w-3.5 h-3.5 opacity-40" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-destructive opacity-60" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                          {r.date.slice(5)} ({getDayName(r.date)})
                        </span>
                        {r.periods.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                            {formatPeriods(r.periods)}
                          </span>
                        )}
                        {r.reason && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                            {r.reason}
                          </span>
                        )}
                      </div>

                      <div className={`border-t border-border pt-2 flex gap-3 flex-wrap`} onClick={e => e.stopPropagation()}>
                        {r.requiredDocs.map(doc => (
                          <label key={doc} className="flex items-center gap-1.5 cursor-pointer">
                            <div
                              onClick={() => toggleSubmittedDoc(r.id, doc, r.submittedDocs)}
                              className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors cursor-pointer ${
                                r.submittedDocs.includes(doc) ? 'bg-primary border-primary' : 'border-input'
                              }`}
                            >
                              {r.submittedDocs.includes(doc) && <CheckIcon className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                            <span className={`text-xs ${r.submittedDocs.includes(doc) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {doc}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Monthly by date */}
        {subTab === 'monthly-date' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronLeftIcon /></button>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="font-semibold text-foreground hover:text-primary transition-colors">
                      {selectedMonth.year}년 {selectedMonth.month}월
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedMonth.year, selectedMonth.month - 1, 1)}
                      onSelect={(day) => {
                        if (day) setSelectedMonth({ year: day.getFullYear(), month: day.getMonth() + 1 });
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {(selectedMonth.year !== now.getFullYear() || selectedMonth.month !== now.getMonth() + 1) && (
                  <button
                    onClick={() => setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() + 1 })}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    오늘로
                  </button>
                )}
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronRightIcon /></button>
            </div>
            <div className="p-4 space-y-4">
              {monthlyRecords.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-medium">해당 월에 출결 기록이 없습니다</p>
                </div>
              ) : (
                (() => {
                  const grouped: Record<string, typeof monthlyRecords> = {};
                  monthlyRecords.forEach(r => {
                    if (!grouped[r.date]) grouped[r.date] = [];
                    grouped[r.date].push(r);
                  });
                  const sortedDates = Object.keys(grouped).sort();
                  return sortedDates.map(date => {
                    const dow = getDayName(date);
                    const dayRecords = grouped[date].sort((a, b) => {
                      const sA = getStudent(a.studentId);
                      const sB = getStudent(b.studentId);
                      return (sA?.number || 0) - (sB?.number || 0);
                    });
                    return (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm text-foreground">{date.slice(5)} ({dow})</span>
                          <span className="text-xs text-muted-foreground">{dayRecords.length}건</span>
                        </div>
                        <div className="border-t border-border mb-2" />
                        <div className="grid grid-cols-2 gap-2">
                          {dayRecords.map(r => (
                            <RecordCard key={r.id} r={r} />
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        )}

        {/* Monthly by student */}
        {subTab === 'monthly-student' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronLeftIcon /></button>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="font-semibold text-foreground hover:text-primary transition-colors">
                      {selectedMonth.year}년 {selectedMonth.month}월
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedMonth.year, selectedMonth.month - 1, 1)}
                      onSelect={(day) => {
                        if (day) setSelectedMonth({ year: day.getFullYear(), month: day.getMonth() + 1 });
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {(selectedMonth.year !== now.getFullYear() || selectedMonth.month !== now.getMonth() + 1) && (
                  <button
                    onClick={() => setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() + 1 })}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    오늘로
                  </button>
                )}
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronRightIcon /></button>
            </div>
            <div className="p-4 space-y-4">
              {students.map(student => {
                const studentRecords = monthlyRecords.filter(r => r.studentId === student.id);
                if (studentRecords.length === 0) return null;
                return (
                  <div key={student.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        student.gender === 'male' ? 'bg-gender-male text-gender-male-text' : 'bg-gender-female text-gender-female-text'
                      }`}>{student.number}</span>
                      <span className="font-semibold text-sm text-foreground">{student.name}</span>
                      <span className="text-xs text-muted-foreground">{studentRecords.length}건</span>
                    </div>
                    <div className="border-t border-border mb-2" />
                    <div className="grid grid-cols-2 gap-2">
                      {studentRecords.map(r => (
                        <RecordCard key={r.id} r={r} showDate hideStudent />
                      ))}
                    </div>
                  </div>
                );
              })}
              {monthlyRecords.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-medium">해당 월에 출결 기록이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Yearly cumulative */}
        {subTab === 'yearly' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
              <button onClick={() => setSelectedSchoolYear(y => y - 1)} className="p-2 rounded-xl hover:bg-muted"><ChevronLeftIcon /></button>
              <span className="font-semibold text-foreground">{selectedSchoolYear}학년도</span>
              <button onClick={() => setSelectedSchoolYear(y => y + 1)} className="p-2 rounded-xl hover:bg-muted"><ChevronRightIcon /></button>
            </div>
            <div className="p-4">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">학생</th>
                      <th className="py-2.5 px-2 text-center font-medium text-muted-foreground">결석</th>
                      <th className="py-2.5 px-2 text-center font-medium text-muted-foreground">지각</th>
                      <th className="py-2.5 px-2 text-center font-medium text-muted-foreground">조퇴</th>
                      <th className="py-2.5 px-2 text-center font-medium text-muted-foreground">결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const stats = yearlyStats[student.id];
                      if (!stats) return null;
                      return (
                        <tr key={student.id} className="border-t border-border">
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs mr-1.5 ${
                              student.gender === 'male' ? 'bg-gender-male text-gender-male-text' : 'bg-gender-female text-gender-female-text'
                            }`}>{student.number}</span>
                            {student.name}
                          </td>
                          <td className="py-2.5 px-2 text-center text-foreground">{stats.결석 || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-foreground">{stats.지각 || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-foreground">{stats.조퇴 || '-'}</td>
                          <td className="py-2.5 px-2 text-center text-foreground">{stats.결과 || '-'}</td>
                        </tr>
                      );
                    })}
                    {Object.keys(yearlyStats).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-muted-foreground">
                          해당 학년도에 출결 기록이 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AttendanceModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        students={students}
        record={editRecord}
        currentDate={editRecord?.date || ''}
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
