import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, Type1, Type2 } from '@/types/attendance';
import { UploadIcon } from './Icons';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NaisCheckProps {
  students: Student[];
  records: AttendanceRecord[];
}

interface NaisRecord {
  date: string; // YYYY-MM-DD
  number: number;
  name: string;
  type1: string; // e.g. 질병, 미인정, 기타, 출석인정
  type2: string; // e.g. 결석, 지각, 조퇴, 결과
  periods: number[];
  reason: string;
}

interface DiffItem {
  type: 'app-only' | 'nais-only' | 'mismatch';
  studentName: string;
  studentNumber: number;
  date: string;
  detail: string;
}

function parseNaisType(출결구분: string): { type1: string; type2: string } | null {
  // 출결구분 is like "질병조퇴", "미인정결석", "출석인정결과", "기타지각" etc.
  const type2List: Type2[] = ['결석', '지각', '조퇴', '결과'];
  const type1List: Type1[] = ['출석인정', '질병', '미인정', '기타'];
  
  const trimmed = 출결구분.trim();
  
  for (const t2 of type2List) {
    if (trimmed.endsWith(t2)) {
      const prefix = trimmed.slice(0, trimmed.length - t2.length);
      for (const t1 of type1List) {
        if (prefix === t1) return { type1: t1, type2: t2 };
      }
      // If prefix doesn't match exactly, try partial
      if (prefix === '') return { type1: '', type2: t2 };
    }
  }
  return null;
}

function parsePeriods(text: string): number[] {
  if (!text || text.trim() === '' || text.trim() === '-') return [];
  const periods: number[] = [];
  // Handle formats like "4,5,6,7" or "4교시~7교시" or "1~3" or "조회,1,2" etc.
  const cleaned = text.replace(/교시/g, '').replace(/\s/g, '');
  
  // Replace 조회->0, 종례->11
  let processed = cleaned.replace(/조회/g, '0').replace(/종례/g, '11');
  
  // Split by comma
  const parts = processed.split(',');
  for (const part of parts) {
    if (part.includes('~') || part.includes('-')) {
      const sep = part.includes('~') ? '~' : '-';
      const [startStr, endStr] = part.split(sep);
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) periods.push(i);
      }
    } else {
      const n = parseInt(part);
      if (!isNaN(n)) periods.push(n);
    }
  }
  return periods.sort((a, b) => a - b);
}

function parseDateFromNais(dateStr: string, year: number): string | null {
  // Handle formats: "11.12.(월)", "11.12", "11/12", "2024-11-12", "2024.11.12" etc.
  const trimmed = dateStr.trim().replace(/\(.*?\)/g, '').trim();
  
  // YYYY-MM-DD
  const fullMatch = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\.?$/);
  if (fullMatch) {
    return `${fullMatch[1]}-${fullMatch[2].padStart(2, '0')}-${fullMatch[3].padStart(2, '0')}`;
  }
  
  // MM.DD or MM/DD
  const shortMatch = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})\.?$/);
  if (shortMatch) {
    return `${year}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`;
  }
  
  return null;
}

function parseCSVLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map(c => c.trim().replace(/"/g, ''));
  }
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}.${day}.(${dayNames[d.getDay()]})`;
}

function formatPeriodsShort(periods: number[]): string {
  if (!periods.length) return '전체';
  const labels: Record<number, string> = { 0: '조회', 11: '종례' };
  const sorted = [...periods].sort((a, b) => a - b);
  return sorted.map(p => labels[p] || `${p}교시`).join(',');
}

const NAIS_CSV_KEY = 'nais_check_csv';
const NAIS_DIFFS_KEY = 'nais_check_diffs';
const NAIS_MONTH_KEY = 'nais_check_month';

export default function NaisCheck({ students, records }: NaisCheckProps) {
  const now = new Date();
  const [csvText, setCsvText] = useState(() => localStorage.getItem(NAIS_CSV_KEY) || '');
  const [diffs, setDiffs] = useState<DiffItem[] | null>(() => {
    try { const d = localStorage.getItem(NAIS_DIFFS_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
  });
  const [checked, setChecked] = useState(() => !!localStorage.getItem(NAIS_DIFFS_KEY));
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    try { const m = localStorage.getItem(NAIS_MONTH_KEY); return m ? JSON.parse(m) : { year: now.getFullYear(), month: now.getMonth() + 1 }; } catch { return { year: now.getFullYear(), month: now.getMonth() + 1 }; }
  });

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(NAIS_CSV_KEY, csvText); }, [csvText]);
  useEffect(() => { if (diffs !== null) localStorage.setItem(NAIS_DIFFS_KEY, JSON.stringify(diffs)); else localStorage.removeItem(NAIS_DIFFS_KEY); }, [diffs]);
  useEffect(() => { localStorage.setItem(NAIS_MONTH_KEY, JSON.stringify(selectedMonth)); }, [selectedMonth]);

  const changeMonth = (dir: number) => {
    setSelectedMonth(prev => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { year: y, month: m };
    });
    setChecked(false);
    setDiffs(null);
  };


  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const parseNaisCSV = (text: string): NaisRecord[] => {
    const lines = text.trim().split('\n');
    const result: NaisRecord[] = [];
    
    for (const line of lines) {
      // Parse CSV properly handling quoted fields
      const cols = parseCSVLine(line);
      
      if (cols.length < 4) continue;
      
      // Format: 일자, 번호, 성명, 출결구분, 결시교시, 사유
      const dateStr = parseDateFromNais(cols[0], selectedMonth.year);
      if (!dateStr) continue;
      
      const num = parseInt(cols[1]);
      if (isNaN(num)) continue;
      
      const name = cols[2]?.trim();
      if (!name) continue;
      
      const typeInfo = parseNaisType(cols[3] || '');
      if (!typeInfo) continue;
      
      const periods = parsePeriods(cols[4] || '');
      const reason = cols[5]?.trim() || '';
      
      result.push({
        date: dateStr,
        number: num,
        name,
        type1: typeInfo.type1,
        type2: typeInfo.type2,
        periods,
        reason,
      });
    }
    return result;
  };

  const runCheck = () => {
    const naisRecords = parseNaisCSV(csvText);
    const results: DiffItem[] = [];

    const targetMonthPrefixes = new Set(naisRecords.map(r => r.date.slice(0, 7)));
    const recordsToCompare = records.filter(r => targetMonthPrefixes.has(r.date.slice(0, 7)));

    // Build a key for matching: date + studentNumber + type1 + type2
    type RecordKey = string;
    const makeKey = (date: string, num: number, t1: string, t2: string): RecordKey =>
      `${date}|${num}|${t1}|${t2}`;

    // Build app record map
    const appMap = new Map<RecordKey, AttendanceRecord[]>();
    recordsToCompare.forEach(r => {
      const student = students.find(s => s.id === r.studentId);
      if (!student) return;
      const key = makeKey(r.date, student.number, r.type1, r.type2);
      if (!appMap.has(key)) appMap.set(key, []);
      appMap.get(key)!.push(r);
    });

    // Also build simpler maps by date+student for detecting records that exist in one but not other
    const appByDateStudent = new Map<string, AttendanceRecord[]>();
    recordsToCompare.forEach(r => {
      const student = students.find(s => s.id === r.studentId);
      if (!student) return;
      const key = `${r.date}|${student.number}`;
      if (!appByDateStudent.has(key)) appByDateStudent.set(key, []);
      appByDateStudent.get(key)!.push(r);
    });

    const naisByDateStudent = new Map<string, NaisRecord[]>();
    naisRecords.forEach(nr => {
      const key = `${nr.date}|${nr.number}`;
      if (!naisByDateStudent.has(key)) naisByDateStudent.set(key, []);
      naisByDateStudent.get(key)!.push(nr);
    });

    const processedKeys = new Set<string>();

    // Check NAIS records - compare against app
    naisRecords.forEach(nr => {
      const key = makeKey(nr.date, nr.number, nr.type1, nr.type2);
      if (processedKeys.has(key)) return;
      processedKeys.add(key);
      
      const student = students.find(s => s.number === nr.number);
      const studentName = student?.name || nr.name;
      
      const appRecs = appMap.get(key);
      if (!appRecs || appRecs.length === 0) {
        // Check if there's any app record for this date+student at all
        const dsKey = `${nr.date}|${nr.number}`;
        const appForDS = appByDateStudent.get(dsKey);
        if (appForDS && appForDS.length > 0) {
          // There are app records but with different type
          results.push({
            type: 'mismatch',
            studentName,
            studentNumber: nr.number,
            date: nr.date,
            detail: `나이스: ${nr.type1}${nr.type2} / 앱: ${appForDS.map(r => `${r.type1}${r.type2}`).join(', ')}`,
          });
        } else {
          results.push({
            type: 'nais-only',
            studentName,
            studentNumber: nr.number,
            date: nr.date,
            detail: `나이스에 ${nr.type1}${nr.type2} 기록이 있지만 앱에는 없습니다.`,
          });
        }
        return;
      }

      // Same type exists - compare periods
      if (nr.periods.length > 0) {
        const appPeriods = appRecs.flatMap(r => r.periods).sort((a, b) => a - b);
        const naisPeriods = [...nr.periods].sort((a, b) => a - b);
        const appSet = JSON.stringify([...new Set(appPeriods)].sort((a, b) => a - b));
        const naisSet = JSON.stringify([...new Set(naisPeriods)].sort((a, b) => a - b));
        
        if (appSet !== naisSet) {
          results.push({
            type: 'mismatch',
            studentName,
            studentNumber: nr.number,
            date: nr.date,
            detail: `${nr.type1}${nr.type2} 교시 불일치 - 나이스: ${formatPeriodsShort(naisPeriods)} / 앱: ${formatPeriodsShort(appPeriods)}`,
          });
        }
      }

      // Compare reasons
      const appReason = appRecs.map(r => r.reason.trim()).join(', ');
      const naisReason = nr.reason.trim();
      if (naisReason && appReason && naisReason !== appReason) {
        results.push({
          type: 'mismatch',
          studentName,
          studentNumber: nr.number,
          date: nr.date,
          detail: `${nr.type1}${nr.type2} 사유 불일치 - 나이스: "${naisReason}" / 앱: "${appReason}"`,
        });
      }
    });

    // Check app records not in NAIS
    const processedAppKeys = new Set<string>();
    recordsToCompare.forEach(r => {
      const student = students.find(s => s.id === r.studentId);
      if (!student) return;
      const dsKey = `${r.date}|${student.number}`;
      if (processedAppKeys.has(dsKey)) return;
      processedAppKeys.add(dsKey);
      
      const naisForDS = naisByDateStudent.get(dsKey);
      if (!naisForDS || naisForDS.length === 0) {
        results.push({
          type: 'app-only',
          studentName: student.name,
          studentNumber: student.number,
          date: r.date,
          detail: `앱에 ${r.type1}${r.type2} 기록이 있지만 나이스에는 없습니다.`,
        });
      }
    });

    // Sort by date then student number
    results.sort((a, b) => a.date.localeCompare(b.date) || a.studentNumber - b.studentNumber);

    setDiffs(results);
    setChecked(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronLeftIcon /></button>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                  {selectedMonth.year}년 {selectedMonth.month}월
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={new Date(selectedMonth.year, selectedMonth.month - 1, 1)}
                  onSelect={(day) => {
                    if (day) {
                      setSelectedMonth({ year: day.getFullYear(), month: day.getMonth() + 1 });
                      setChecked(false);
                      setDiffs(null);
                    }
                  }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {(selectedMonth.year !== now.getFullYear() || selectedMonth.month !== now.getMonth() + 1) && (
              <button
                onClick={() => { setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() + 1 }); setChecked(false); setDiffs(null); }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                오늘로
              </button>
            )}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted transition-colors"><ChevronRightIcon /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">

        {/* Instructions */}
        <div className="bg-accent rounded-2xl p-4 text-sm text-foreground">
          <p className="font-semibold mb-2 text-accent-foreground">나이스 출결현황 파일 등록</p>
          <p className="text-xs text-muted-foreground mb-2">
            나이스 → [학적] → [출결현황및통계] → '학급별출결현황' → 월 선택 및 '인정내역 표시' 체크 → '조회' 클릭 → 우측의 '월별 출결현황' 클릭 → 해당 월 선택 → 엑셀 파일 다운로드
          </p>
          <p className="text-xs text-muted-foreground">
            엑셀 파일을 '다른 이름으로 저장'하면서 '파일 형식'을 'CSV UTF-8(쉼표로 분리)'로 지정하여 저장해 주세요.
          </p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-input rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
        >
          <UploadIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-muted-foreground mt-1">CSV 형식 지원</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
        </div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">또는 텍스트 직접 붙여넣기</label>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={4}
            placeholder={"일자,번호,성명,출결구분,결시교시,사유\n11.12.(월),1,홍길동,질병조퇴,4~7,병원 방문"}
            className="w-full p-3 rounded-xl border border-input bg-background text-foreground text-sm resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={runCheck}
            disabled={!csvText.trim()}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-40 transition-opacity"
          >
            점검하기
          </button>
          {csvText.trim() && (
            <button
              onClick={() => { setCsvText(''); setDiffs(null); setChecked(false); localStorage.removeItem(NAIS_DIFFS_KEY); }}
              className="px-4 py-3 bg-muted text-muted-foreground rounded-xl font-semibold transition-opacity"
            >
              초기화
            </button>
          )}
        </div>

        {/* Results */}
        {checked && diffs !== null && (
          <div className="space-y-3">
            {diffs.length === 0 ? (
              <div className="bg-att-other-bg border border-att-other/20 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">👍</div>
                <p className="font-semibold text-att-other">완벽합니다!</p>
                <p className="text-sm text-muted-foreground mt-1">나이스 데이터와 앱 데이터가 일치합니다.</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-att-unexcused">{diffs.length}건의 불일치를 발견했습니다</p>
                {diffs.map((d, i) => (
                  <div key={i} className="bg-att-unexcused-bg border border-att-unexcused/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-att-unexcused/10 text-att-unexcused">
                        {d.type === 'app-only' ? '앱에만 존재' : d.type === 'nais-only' ? '나이스에만 존재' : '불일치'}
                      </span>
                      <span className="font-medium text-sm text-foreground">
                        {formatDateShort(d.date)} {d.studentNumber}번 {d.studentName}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.detail}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
