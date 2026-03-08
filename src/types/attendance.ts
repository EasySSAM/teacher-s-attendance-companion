export interface Student {
  id: string;
  number: number;
  name: string;
  gender: 'male' | 'female';
  transferOutDate?: string; // YYYY-MM-DD
  transferInDate?: string;  // YYYY-MM-DD
}

export type Type1 = '출석인정' | '질병' | '미인정' | '기타';
export type Type2 = '결석' | '지각' | '조퇴' | '결과';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  type1: Type1;
  type2: Type2;
  reason: string;
  periods: number[]; // 0=조회, 1~7=교시, 8=종례
  requiredDocs: string[];
  submittedDocs: string[];
}

export interface DaySchedule {
  [key: string]: number; // day name -> max period
}

export const DEFAULT_SCHEDULE: DaySchedule = {
  '월': 7,
  '화': 7,
  '수': 6,
  '목': 6,
  '금': 7,
};

export const PERIOD_LABELS: Record<number, string> = {
  0: '조회',
  1: '1교시',
  2: '2교시',
  3: '3교시',
  4: '4교시',
  5: '5교시',
  6: '6교시',
  7: '7교시',
  8: '8교시',
  9: '9교시',
  10: '10교시',
  11: '종례',
};

export const TYPE1_OPTIONS: Type1[] = ['출석인정', '질병', '미인정', '기타'];
export const TYPE2_OPTIONS: Type2[] = ['결석', '지각', '조퇴', '결과'];

export const SAMPLE_STUDENTS: Student[] = [
  { id: 's1', number: 1, name: '가가가', gender: 'male' },
  { id: 's2', number: 2, name: '나나나', gender: 'female' },
  { id: 's3', number: 3, name: '다다다', gender: 'male' },
  { id: 's4', number: 4, name: '라라라', gender: 'female' },
  { id: 's5', number: 5, name: '마마마', gender: 'male' },
  { id: 's6', number: 6, name: '바바바', gender: 'female' },
  { id: 's7', number: 7, name: '사사사', gender: 'male' },
];
