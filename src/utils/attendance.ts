import { Type1, Type2, DaySchedule, PERIOD_LABELS } from '@/types/attendance';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  return `${y}. ${String(m).padStart(2, '0')}. ${String(day).padStart(2, '0')}. (${dow})`;
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export function addDaysSkipWeekend(dateStr: string, direction: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  do {
    d.setDate(d.getDate() + direction);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return toDateStr(d);
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayStr(): string {
  return toDateStr(new Date());
}

export function getMaxPeriod(dateStr: string, schedule: DaySchedule): number {
  const dayName = getDayName(dateStr);
  return schedule[dayName] || 7;
}

export function getAllPeriods(dateStr: string, schedule: DaySchedule): number[] {
  const max = getMaxPeriod(dateStr, schedule);
  const periods = [0]; // 조회
  for (let i = 1; i <= max; i++) periods.push(i);
  periods.push(11); // 종례
  return periods;
}

export function formatPeriods(periods: number[]): string {
  if (!periods.length) return '';
  const sorted = [...periods].sort((a, b) => a - b);
  
  // Check if it's all periods (full day)
  const groups: number[][] = [];
  let current = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1 || (sorted[i] === 11 && sorted[i - 1] + 1 > 10)) {
      current.push(sorted[i]);
    } else {
      groups.push(current);
      current = [sorted[i]];
    }
  }
  groups.push(current);
  
  return groups.map(g => {
    if (g.length === 1) return PERIOD_LABELS[g[0]];
    return `${PERIOD_LABELS[g[0]]}~${PERIOD_LABELS[g[g.length - 1]]}`;
  }).join(', ');
}

export function getRequiredDocs(type1: Type1, type2: Type2, reason: string): string[] {
  if (type1 === '출석인정' && reason.includes('체험학습')) {
    return ['신청서', '보고서', '증빙자료'];
  }
  if ((type1 === '출석인정' || type1 === '질병') && type2 === '결석') {
    return ['결석신고서', '증빙자료'];
  }
  if (type1 === '기타' && type2 === '결석') {
    return ['내부결재', '증빙자료'];
  }
  if (type1 === '출석인정' && (type2 === '지각' || type2 === '조퇴' || type2 === '결과')) {
    return ['출석인정확인서', '증빙자료'];
  }
  return [];
}

export function getType1Color(type1: Type1) {
  switch (type1) {
    case '출석인정': return { bg: 'bg-att-approved-bg', text: 'text-att-approved', border: 'border-att-approved/20' };
    case '질병': return { bg: 'bg-att-sick-bg', text: 'text-att-sick', border: 'border-att-sick/20' };
    case '기타': return { bg: 'bg-att-other-bg', text: 'text-att-other', border: 'border-att-other/20' };
    case '미인정': return { bg: 'bg-att-unexcused-bg', text: 'text-att-unexcused', border: 'border-att-unexcused/20' };
  }
}

export function getSchoolYear(date: Date = new Date()): number {
  return date.getMonth() < 2 ? date.getFullYear() - 1 : date.getFullYear();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
