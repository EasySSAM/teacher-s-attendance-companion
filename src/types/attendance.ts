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
  { id: 's1', number: 1, name: '김민준', gender: 'male' },
  { id: 's2', number: 2, name: '이서연', gender: 'female' },
  { id: 's3', number: 3, name: '박지호', gender: 'male' },
  { id: 's4', number: 4, name: '최수아', gender: 'female' },
  { id: 's5', number: 5, name: '정예준', gender: 'male' },
  { id: 's6', number: 6, name: '강하은', gender: 'female' },
  { id: 's7', number: 7, name: '조민서', gender: 'male' },
  { id: 's8', number: 8, name: '윤지유', gender: 'female' },
  { id: 's9', number: 9, name: '임도현', gender: 'male' },
  { id: 's10', number: 10, name: '한소윤', gender: 'female' },
  { id: 's11', number: 11, name: '오시우', gender: 'male' },
  { id: 's12', number: 12, name: '신지아', gender: 'female' },
  { id: 's13', number: 13, name: '서주원', gender: 'male' },
  { id: 's14', number: 14, name: '권나윤', gender: 'female' },
  { id: 's15', number: 15, name: '황건우', gender: 'male' },
  { id: 's16', number: 16, name: '안수빈', gender: 'female' },
  { id: 's17', number: 17, name: '송현우', gender: 'male' },
  { id: 's18', number: 18, name: '전다은', gender: 'female' },
  { id: 's19', number: 19, name: '홍준혁', gender: 'male' },
  { id: 's20', number: 20, name: '문채원', gender: 'female' },
  { id: 's21', number: 21, name: '양태현', gender: 'male' },
  { id: 's22', number: 22, name: '배유진', gender: 'female' },
  { id: 's23', number: 23, name: '백승민', gender: 'male' },
  { id: 's24', number: 24, name: '노예린', gender: 'female' },
  { id: 's25', number: 25, name: '하지환', gender: 'male' },
  { id: 's26', number: 26, name: '유하린', gender: 'female' },
  { id: 's27', number: 27, name: '남우진', gender: 'male' },
  { id: 's28', number: 28, name: '구민지', gender: 'female' },
  { id: 's29', number: 29, name: '차은호', gender: 'male' },
  { id: 's30', number: 30, name: '류서현', gender: 'female' },
];

export const SAMPLE_RECORDS: AttendanceRecord[] = [
  { id: 'r1', studentId: 's3', date: '2026-03-02', type1: '질병', type2: '결석', reason: '감기', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['결석신고서','증빙자료'], submittedDocs: ['결석신고서'] },
  { id: 'r2', studentId: 's7', date: '2026-03-02', type1: '기타', type2: '결석', reason: '가사', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['내부결재','증빙자료'], submittedDocs: [] },
  { id: 'r3', studentId: 's12', date: '2026-03-02', type1: '출석인정', type2: '조퇴', reason: '병원 진료', periods: [5,6,7,11], requiredDocs: ['출석인정확인서','증빙자료'], submittedDocs: ['출석인정확인서','증빙자료'] },
  { id: 'r4', studentId: 's5', date: '2026-03-03', type1: '질병', type2: '지각', reason: '복통', periods: [0,1], requiredDocs: [], submittedDocs: [] },
  { id: 'r5', studentId: 's18', date: '2026-03-03', type1: '미인정', type2: '결석', reason: '미인정', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: [], submittedDocs: [] },
  { id: 'r6', studentId: 's21', date: '2026-03-03', type1: '출석인정', type2: '결석', reason: '체험학습', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['신청서','보고서','증빙자료'], submittedDocs: ['신청서'] },
  { id: 'r7', studentId: 's2', date: '2026-03-04', type1: '질병', type2: '조퇴', reason: '생리통', periods: [4,5,6,11], requiredDocs: [], submittedDocs: [] },
  { id: 'r8', studentId: 's9', date: '2026-03-04', type1: '질병', type2: '결석', reason: '발열', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['결석신고서','증빙자료'], submittedDocs: ['결석신고서','증빙자료'] },
  { id: 'r9', studentId: 's15', date: '2026-03-04', type1: '기타', type2: '지각', reason: '교통체증', periods: [0,1], requiredDocs: [], submittedDocs: [] },
  { id: 'r10', studentId: 's25', date: '2026-03-04', type1: '미인정', type2: '결과', reason: '미인정', periods: [3,4], requiredDocs: [], submittedDocs: [] },
  { id: 'r11', studentId: 's10', date: '2026-03-05', type1: '질병', type2: '결석', reason: '장염', periods: [0,1,2,3,4,5,6,11], requiredDocs: ['결석신고서','증빙자료'], submittedDocs: [] },
  { id: 'r12', studentId: 's14', date: '2026-03-05', type1: '출석인정', type2: '결석', reason: '체험학습', periods: [0,1,2,3,4,5,6,11], requiredDocs: ['신청서','보고서','증빙자료'], submittedDocs: ['신청서','보고서','증빙자료'] },
  { id: 'r13', studentId: 's27', date: '2026-03-05', type1: '질병', type2: '조퇴', reason: '두통', periods: [5,6,11], requiredDocs: [], submittedDocs: [] },
  { id: 'r14', studentId: 's30', date: '2026-03-05', type1: '기타', type2: '결석', reason: '가족행사', periods: [0,1,2,3,4,5,6,11], requiredDocs: ['내부결재','증빙자료'], submittedDocs: ['내부결재'] },
  { id: 'r15', studentId: 's1', date: '2026-03-06', type1: '질병', type2: '결석', reason: '감기', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['결석신고서','증빙자료'], submittedDocs: [] },
  { id: 'r16', studentId: 's6', date: '2026-03-06', type1: '출석인정', type2: '지각', reason: '병원 진료', periods: [0,1], requiredDocs: ['출석인정확인서','증빙자료'], submittedDocs: [] },
  { id: 'r17', studentId: 's19', date: '2026-03-06', type1: '미인정', type2: '결석', reason: '미인정', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: [], submittedDocs: [] },
  { id: 'r18', studentId: 's22', date: '2026-03-06', type1: '질병', type2: '결과', reason: '치과 치료', periods: [5,6], requiredDocs: [], submittedDocs: [] },
  { id: 'r19', studentId: 's8', date: '2026-03-06', type1: '질병', type2: '조퇴', reason: '생리통', periods: [6,7,11], requiredDocs: [], submittedDocs: [] },
  { id: 'r20', studentId: 's16', date: '2026-03-06', type1: '출석인정', type2: '결석', reason: '체험학습', periods: [0,1,2,3,4,5,6,7,11], requiredDocs: ['신청서','보고서','증빙자료'], submittedDocs: ['신청서','보고서'] },
];
