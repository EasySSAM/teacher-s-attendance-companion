import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, Type1 } from '@/types/attendance';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from './Icons';
import { formatDate, getType1Color, formatPeriods, getSchoolYear } from '@/utils/attendance';

interface StatisticsProps {
  students: Student[];
  records: AttendanceRecord[];
  onUpdateRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
}

type SubTab = 'docs' | 'monthly-date' | 'monthly-student' | 'yearly';

export default function Statistics({ students, records, onUpdateRecord }: StatisticsProps) {
  const [subTab, setSubTab] = useState<SubTab>('docs');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(getSchoolYear());

  const getStudent = (id: string) => students.find(s => s.id === id);

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
    const endDate = `${selectedSchoolYear + 1}-02-28`;
    return records.filter(r => r.date >= startDate && r.date <= endDate && r.type1 !== '출석인정');
  }, [records, selectedSchoolYear]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Sub tabs */}
      <div className="bg-card border-b border-border px-2 pt-3 pb-0">
        <div className="flex gap-1 overflow-x-auto">
          {subTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`px-3 py-2 text-xs font-medium rounded-t-xl whitespace-nowrap transition-colors ${
                subTab === t.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Docs */}
        {subTab === 'docs' && (
          <div className="p-4 space-y-3">
            {missingDocRecords.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-2">📄</div>
                <p className="font-medium">미제출 서류가 없습니다</p>
              </div>
            ) : (
              missingDocRecords.map(r => {
                const student = getStudent(r.studentId);
                if (!student) return null;
                const colors = getType1Color(r.type1);
                return (
                  <div key={r.id} className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{student.number}번 {student.name}</span>
                        <span className={`text-xs font-medium ${colors.text}`}>{r.type1}{r.type2}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <div className="space-y-1.5 mt-3">
                      {r.requiredDocs.map(doc => (
                        <label key={doc} className="flex items-center gap-2 cursor-pointer">
                          <div
                            onClick={() => toggleSubmittedDoc(r.id, doc, r.submittedDocs)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer ${
                              r.submittedDocs.includes(doc) ? 'bg-primary border-primary' : 'border-input'
                            }`}
                          >
                            {r.submittedDocs.includes(doc) && <CheckIcon className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className={`text-sm ${r.submittedDocs.includes(doc) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {doc}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Monthly by date */}
        {subTab === 'monthly-date' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted"><ChevronLeftIcon /></button>
              <span className="font-semibold text-foreground">{selectedMonth.year}년 {selectedMonth.month}월</span>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted"><ChevronRightIcon /></button>
            </div>
            <div className="p-4 space-y-2">
              {monthlyRecords.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="font-medium">해당 월에 출결 기록이 없습니다</p>
                </div>
              ) : (
                monthlyRecords.map(r => {
                  const student = getStudent(r.studentId);
                  if (!student) return null;
                  const colors = getType1Color(r.type1);
                  return (
                    <div key={r.id} className={`${colors.bg} border ${colors.border} rounded-xl p-3 flex items-center justify-between`}>
                      <div>
                        <span className="text-xs text-muted-foreground">{r.date.slice(5)}</span>
                        <span className="mx-2 font-medium text-sm text-foreground">{student.number}번 {student.name}</span>
                        <span className={`text-xs font-medium ${colors.text}`}>{r.type1}{r.type2}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.reason || '-'}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Monthly by student */}
        {subTab === 'monthly-student' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted"><ChevronLeftIcon /></button>
              <span className="font-semibold text-foreground">{selectedMonth.year}년 {selectedMonth.month}월</span>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted"><ChevronRightIcon /></button>
            </div>
            <div className="p-4 space-y-4">
              {students.map(student => {
                const studentRecords = monthlyRecords.filter(r => r.studentId === student.id);
                if (studentRecords.length === 0) return null;
                return (
                  <div key={student.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        student.gender === 'male' ? 'bg-gender-male text-gender-male-text' : 'bg-gender-female text-gender-female-text'
                      }`}>{student.number}</span>
                      <span className="font-semibold text-foreground">{student.name}</span>
                      <span className="text-xs text-muted-foreground">{studentRecords.length}건</span>
                    </div>
                    {studentRecords.map(r => {
                      const colors = getType1Color(r.type1);
                      return (
                        <div key={r.id} className={`${colors.bg} rounded-lg p-2 mb-1.5 text-xs`}>
                          <span className="text-muted-foreground">{r.date.slice(5)}</span>
                          <span className={`ml-2 font-medium ${colors.text}`}>{r.type1}{r.type2}</span>
                          <span className="ml-2 text-muted-foreground">{r.reason || '-'}</span>
                        </div>
                      );
                    })}
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
    </div>
  );
}
