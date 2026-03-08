import { useState, useCallback, useEffect } from 'react';
import { Student, AttendanceRecord, DaySchedule, DEFAULT_SCHEDULE, SAMPLE_STUDENTS } from '@/types/attendance';

const STUDENTS_KEY = 'attendance_students_list';
const RECORDS_KEY = 'attendance_records_pro';
const SCHEDULE_KEY = 'attendance_schedule';

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
    loadFromStorage(RECORDS_KEY, [])
  );
  const [schedule, setSchedule] = useState<DaySchedule>(() =>
    loadFromStorage(SCHEDULE_KEY, DEFAULT_SCHEDULE)
  );

  useEffect(() => saveToStorage(STUDENTS_KEY, students), [students]);
  useEffect(() => saveToStorage(RECORDS_KEY, records), [records]);
  useEffect(() => saveToStorage(SCHEDULE_KEY, schedule), [schedule]);

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

  return {
    students,
    records,
    schedule,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkAddStudents,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsForDate,
    getRecordsForMonth,
    getRecordsForStudent,
    getActiveStudents,
    getFrequentReasons,
    updateSchedule,
  };
}
