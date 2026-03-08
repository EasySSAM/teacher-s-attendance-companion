import { useState, useCallback, useEffect } from 'react';
import { Student, AttendanceRecord, DaySchedule, Type1, DEFAULT_SCHEDULE, SAMPLE_STUDENTS, SAMPLE_RECORDS } from '@/types/attendance';

const STUDENTS_KEY = 'attendance_students_list';
const RECORDS_KEY = 'attendance_records_pro';
const SCHEDULE_KEY = 'attendance_schedule';
const WARNING_PHRASES_KEY = 'attendance_warning_phrases';
const YEARLY_EXCLUDE_TYPES_KEY = 'attendance_yearly_exclude_types';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useAttendanceStore() {
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage(STUDENTS_KEY, SAMPLE_STUDENTS)
  );
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    loadFromStorage(RECORDS_KEY, SAMPLE_RECORDS)
  );
  const [schedule, setSchedule] = useState<DaySchedule>(() =>
    loadFromStorage(SCHEDULE_KEY, DEFAULT_SCHEDULE)
  );
  const [warningPhrases, setWarningPhrases] = useState<string[]>(() =>
    loadFromStorage(WARNING_PHRASES_KEY, [])
  );
  const [yearlyExcludeTypes, setYearlyExcludeTypes] = useState<Type1[]>(() =>
    loadFromStorage(YEARLY_EXCLUDE_TYPES_KEY, ['출석인정'] as Type1[])
  );

  useEffect(() => saveToStorage(STUDENTS_KEY, students), [students]);
  useEffect(() => saveToStorage(RECORDS_KEY, records), [records]);
  useEffect(() => saveToStorage(SCHEDULE_KEY, schedule), [schedule]);
  useEffect(() => saveToStorage(WARNING_PHRASES_KEY, warningPhrases), [warningPhrases]);
  useEffect(() => saveToStorage(YEARLY_EXCLUDE_TYPES_KEY, yearlyExcludeTypes), [yearlyExcludeTypes]);

  const addStudent = useCallback((student: Student) => {
    setStudents(prev => [...prev, student].sort((a, b) => a.number - b.number));
  }, []);

  const updateStudent = useCallback((id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s).sort((a, b) => a.number - b.number));
  }, []);

  const deleteStudent = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setRecords(prev => prev.filter(r => r.studentId !== id));
  }, []);

  const bulkAddStudents = useCallback((newStudents: Student[]) => {
    setStudents(newStudents.sort((a, b) => a.number - b.number));
  }, []);

  const deleteAllStudents = useCallback(() => {
    setStudents([]);
    setRecords([]);
  }, []);

  const importData = useCallback((newStudents: Student[], newRecords: AttendanceRecord[]) => {
    setStudents(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const merged = [...prev, ...newStudents.filter(s => !existingIds.has(s.id))];
      return merged.sort((a, b) => a.number - b.number);
    });
    setRecords(prev => {
      const existingIds = new Set(prev.map(r => r.id));
      return [...prev, ...newRecords.filter(r => !existingIds.has(r.id))];
    });
  }, []);

  const addRecord = useCallback((record: AttendanceRecord) => {
    setRecords(prev => [...prev, record]);
  }, []);

  const updateRecord = useCallback((id: string, updates: Partial<AttendanceRecord>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const getRecordsForDate = useCallback((date: string) => {
    return records.filter(r => r.date === date);
  }, [records]);

  const getRecordsForMonth = useCallback((year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return records.filter(r => r.date.startsWith(prefix));
  }, [records]);

  const getRecordsForStudent = useCallback((studentId: string) => {
    return records.filter(r => r.studentId === studentId);
  }, [records]);

  const getActiveStudents = useCallback((date: string) => {
    return students.filter(s => {
      if (s.transferOutDate && date >= s.transferOutDate) return false;
      if (s.transferInDate && date < s.transferInDate) return false;
      return true;
    });
  }, [students]);

  const getFrequentReasons = useCallback(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      if (r.reason && r.reason !== '미인정') {
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([reason]) => reason);
  }, [records]);

  const updateSchedule = useCallback((newSchedule: DaySchedule) => {
    setSchedule(newSchedule);
  }, []);

  const updateWarningPhrases = useCallback((phrases: string[]) => {
    setWarningPhrases(phrases);
  }, []);

  const updateYearlyExcludeTypes = useCallback((types: Type1[]) => {
    setYearlyExcludeTypes(types);
  }, []);

  return {
    students,
    records,
    schedule,
    warningPhrases,
    yearlyExcludeTypes,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkAddStudents,
    deleteAllStudents,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsForDate,
    getRecordsForMonth,
    getRecordsForStudent,
    getActiveStudents,
    getFrequentReasons,
    updateSchedule,
    updateWarningPhrases,
    updateYearlyExcludeTypes,
  };
}
