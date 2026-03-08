import React, { useState, useRef, useMemo } from 'react';
import { Student, AttendanceRecord, Type2 } from '@/types/attendance';
import { UploadIcon } from './Icons';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface NaisCheckProps {
  students: Student[];
  records: AttendanceRecord[];
}

interface NaisRow {
  number: number;
  name: string;
  결석: { 질병: number; 미인정: number; 기타: number; 출석인정: number };
  지각: { 질병: number; 미인정: number; 기타: number; 출석인정: number };
  조퇴: { 질병: number; 미인정: number; 기타: number; 출석인정: number };
  결과: { 질병: number; 미인정: number; 기타: number; 출석인정: number };
}

interface DiffItem {
  type: 'app-only' | 'nais-only' | 'mismatch';
  studentName: string;
  studentNumber: number;
  detail: string;
}

export default function NaisCheck({ students, records }: NaisCheckProps) {
  const [csvText, setCsvText] = useState('');
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null);
  const [checked, setChecked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

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

  const monthlyRecords = useMemo(() => {
    const prefix = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
    return records.filter(r => r.date.startsWith(prefix));
  }, [records, selectedMonth]);

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

  const parseNaisCSV = (text: string): NaisRow[] => {
    const lines = text.trim().split('\n');
    const rows: NaisRow[] = [];
    
    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
      // Try to find rows with student number and name
      const num = parseInt(cols[0]);
      if (isNaN(num)) continue;
      
      const name = cols[1];
      if (!name || name.length === 0) continue;

      // Parse counts - try standard NAIS format
      // Format varies, try to parse what we can
      const row: NaisRow = {
        number: num,
        name,
        결석: { 질병: parseInt(cols[2]) || 0, 미인정: parseInt(cols[3]) || 0, 기타: parseInt(cols[4]) || 0, 출석인정: parseInt(cols[5]) || 0 },
        지각: { 질병: parseInt(cols[6]) || 0, 미인정: parseInt(cols[7]) || 0, 기타: parseInt(cols[8]) || 0, 출석인정: parseInt(cols[9]) || 0 },
        조퇴: { 질병: parseInt(cols[10]) || 0, 미인정: parseInt(cols[11]) || 0, 기타: parseInt(cols[12]) || 0, 출석인정: parseInt(cols[13]) || 0 },
        결과: { 질병: parseInt(cols[14]) || 0, 미인정: parseInt(cols[15]) || 0, 기타: parseInt(cols[16]) || 0, 출석인정: parseInt(cols[17]) || 0 },
      };
      rows.push(row);
    }
    return rows;
  };

  const runCheck = () => {
    const naisRows = parseNaisCSV(csvText);
    const results: DiffItem[] = [];

    // Build app stats per student for this month
    const appStats: Record<number, Record<string, Record<string, number>>> = {};
    monthlyRecords.forEach(r => {
      const student = students.find(s => s.id === r.studentId);
      if (!student) return;
      if (!appStats[student.number]) appStats[student.number] = {};
      const key = r.type2;
      if (!appStats[student.number][key]) appStats[student.number][key] = {};
      const t1 = r.type1;
      appStats[student.number][key][t1] = (appStats[student.number][key][t1] || 0) + 1;
    });

    // Compare
    const type2s: Type2[] = ['결석', '지각', '조퇴', '결과'];
    const type1s = ['질병', '미인정', '기타', '출석인정'] as const;

    // Check app records against NAIS
    Object.entries(appStats).forEach(([numStr, type2Map]) => {
      const num = parseInt(numStr);
      const naisRow = naisRows.find(r => r.number === num);
      const student = students.find(s => s.number === num);
      if (!student) return;

      if (!naisRow) {
        results.push({
          type: 'app-only',
          studentName: student.name,
          studentNumber: num,
          detail: '앱에는 있지만 나이스에 없는 학생입니다.',
        });
        return;
      }

      type2s.forEach(t2 => {
        type1s.forEach(t1 => {
          const appCount = type2Map[t2]?.[t1] || 0;
          const naisCount = naisRow[t2][t1] || 0;
          if (appCount !== naisCount) {
            results.push({
              type: 'mismatch',
              studentName: student.name,
              studentNumber: num,
              detail: `${t1}${t2}: 앱 ${appCount}건 / 나이스 ${naisCount}건`,
            });
          }
        });
      });
    });

    // Check NAIS records not in app
    naisRows.forEach(nRow => {
      const hasAnyData = type2s.some(t2 => type1s.some(t1 => nRow[t2][t1] > 0));
      if (!hasAnyData) return;
      
      if (!appStats[nRow.number]) {
        const student = students.find(s => s.number === nRow.number);
        results.push({
          type: 'nais-only',
          studentName: student?.name || nRow.name,
          studentNumber: nRow.number,
          detail: '나이스에는 있지만 앱에 없는 기록입니다.',
        });
      }
    });

    setDiffs(results);
    setChecked(true);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Month selector */}
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted"><ChevronLeftIcon /></button>
          <span className="font-semibold text-foreground">{selectedMonth.year}년 {selectedMonth.month}월</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-xl hover:bg-muted"><ChevronRightIcon /></button>
        </div>

        {/* Instructions */}
        <div className="bg-accent rounded-2xl p-4 text-sm text-foreground">
          <p className="font-semibold mb-2 text-accent-foreground">나이스 월별출결현황 파일 등록</p>
          <p className="text-xs text-muted-foreground mb-1">
            경로: 나이스 → [출결현황및통계] → [출결현황및통계] → 우측 '월별출결현황' 버튼 → 해당 월 선택 → 엑셀 파일 다운로드
          </p>
          <p className="text-xs text-muted-foreground">
            엑셀 파일을 '다른 이름으로 저장'하여 CSV파일로 저장한 후 등록해 주세요.
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
            placeholder="CSV 데이터를 붙여넣으세요..."
            className="w-full p-3 rounded-xl border border-input bg-background text-foreground text-sm resize-none"
          />
        </div>

        {/* Check button */}
        <button
          onClick={runCheck}
          disabled={!csvText.trim()}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-40 transition-opacity"
        >
          점검하기
        </button>

        {/* Results */}
        {checked && diffs !== null && (
          <div className="space-y-3">
            {diffs.length === 0 ? (
              <div className="bg-att-other-bg border border-att-other/20 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">👍</div>
                <p className="font-semibold text-att-other">완벽합니다!</p>
                <p className="text-sm text-muted-foreground mt-1">나이스 데이터와 일치합니다.</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-att-unexcused">{diffs.length}건의 차이를 발견했습니다</p>
                {diffs.map((d, i) => (
                  <div key={i} className="bg-att-unexcused-bg border border-att-unexcused/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-att-unexcused/10 text-att-unexcused">
                        {d.type === 'app-only' ? '앱에만 존재' : d.type === 'nais-only' ? '나이스에만 존재' : '불일치'}
                      </span>
                      <span className="font-medium text-sm text-foreground">{d.studentNumber}번 {d.studentName}</span>
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
  );
}
