import React, { useState } from 'react';
import { Student, AttendanceRecord, PERIOD_LABELS } from '@/types/attendance';
import { encryptData, decryptData } from '@/utils/crypto';
import { toDateStr } from '@/utils/attendance';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DataBackupProps {
  students: Student[];
  records: AttendanceRecord[];
  onImportData: (students: Student[], records: AttendanceRecord[]) => void;
}

export default function DataBackup({ students, records, onImportData }: DataBackupProps) {
  const [startDate, setStartDate] = useState('');

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
  };
  const [endDate, setEndDate] = useState('');
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [exportMode, setExportMode] = useState<'csv' | 'json'>('json');

  const filteredRecords = records.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });

  const handleExportCSV = () => {
    const studentMap = new Map(students.map(s => [s.id, s]));
    const header = '날짜,번호,이름,성별,구분1,구분2,사유,교시,필요서류,제출서류';
    const rows = filteredRecords
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => {
        const s = studentMap.get(r.studentId);
        const periods = r.periods.map(p => PERIOD_LABELS[p] || String(p)).join(';');
        const required = r.requiredDocs.join(';');
        const submitted = r.submittedDocs.join(';');
        return [
          r.date,
          s?.number ?? '',
          s?.name ?? '',
          s?.gender === 'male' ? '남' : '여',
          r.type1,
          r.type2,
          `"${(r.reason || '').replace(/"/g, '""')}"`,
          periods,
          required,
          submitted,
        ].join(',');
      });
    return header + '\n' + rows.join('\n');
  };

  const handleExportJSON = () => {
    const relevantStudentIds = new Set(filteredRecords.map(r => r.studentId));
    const relevantStudents = students.filter(s => relevantStudentIds.has(s.id));
    return JSON.stringify({ students: relevantStudents, records: filteredRecords }, null, 2);
  };

  const downloadFile = (content: string | ArrayBuffer, filename: string, type: string) => {
    const blob = content instanceof ArrayBuffer
      ? new Blob([content], { type })
      : new Blob(['\uFEFF' + content], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (filteredRecords.length === 0 && exportMode === 'csv') {
      alert('선택한 기간에 출결 기록이 없습니다.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    if (exportMode === 'csv') {
      const csv = handleExportCSV();
      if (useEncryption && password.length === 6) {
        const encrypted = await encryptData(csv, password);
        downloadFile(encrypted, `출결_${dateStr}.csv.enc`, 'application/octet-stream');
      } else {
        downloadFile(csv, `출결_${dateStr}.csv`, 'text/csv');
      }
    } else {
      const json = handleExportJSON();
      if (useEncryption && password.length === 6) {
        const encrypted = await encryptData(json, password);
        downloadFile(encrypted, `출결백업_${dateStr}.json.enc`, 'application/octet-stream');
      } else {
        downloadFile(json, `출결백업_${dateStr}.json`, 'application/json');
      }
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    try {
      const isEncrypted = file.name.endsWith('.enc');

      if (isEncrypted) {
        if (!importPassword || importPassword.length !== 6) {
          setImportError('암호 6자리를 입력해 주세요.');
          return;
        }
        const buffer = await file.arrayBuffer();
        let decrypted: string;
        try {
          decrypted = await decryptData(buffer, importPassword);
        } catch {
          setImportError('암호가 올바르지 않습니다.');
          return;
        }
        parseAndImport(decrypted, file.name);
      } else {
        const text = await file.text();
        parseAndImport(text, file.name);
      }
    } catch {
      setImportError('파일을 읽는 중 오류가 발생했습니다.');
    }
    e.target.value = '';
  };

  const parseAndImport = (content: string, filename: string) => {
    // Try JSON first - also handle iOS duplicate suffix like ".json 3"
    const cleanName = filename.replace('.enc', '').replace(/\s+\d+$/, '');
    const isJson = cleanName.endsWith('.json') || content.trimStart().startsWith('{');
    if (isJson) {
      try {
        const data = JSON.parse(content);
        if (data.students && data.records) {
          if (confirm(`학생 ${data.students.length}명, 기록 ${data.records.length}건을 불러옵니다. 기존 데이터에 병합됩니다.`)) {
            onImportData(data.students, data.records);
          }
          return;
        }
      } catch {
        setImportError('JSON 파일 형식이 올바르지 않습니다.');
        return;
      }
    }
    setImportError('지원하지 않는 파일 형식입니다. JSON 백업 파일을 사용해 주세요.');
  };

  const recordCount = filteredRecords.length;
  const totalCount = records.length;

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-foreground">데이터 백업</h3>

      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">내보내기</p>

        {/* Export mode */}
        <div className="flex rounded-xl border border-input overflow-hidden">
          <button
            type="button"
            onClick={() => setExportMode('json')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              exportMode === 'json' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
            }`}
          >
            JSON (복원용)
          </button>
          <button
            type="button"
            onClick={() => setExportMode('csv')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              exportMode === 'csv' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
            }`}
          >
            CSV (열람용)
          </button>
        </div>

        {/* Date range */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">시작일</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm text-left">
                  {startDate ? formatDisplayDate(startDate) : <span className="text-muted-foreground">선택</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                  onSelect={(day) => { if (day) setStartDate(toDateStr(day)); }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">종료일</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm text-left">
                  {endDate ? formatDisplayDate(endDate) : <span className="text-muted-foreground">선택</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate + 'T00:00:00') : undefined}
                  onSelect={(day) => { if (day) setEndDate(toDateStr(day)); }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs text-primary font-medium hover:underline"
          >
            기간 초기화
          </button>
        )}

        <p className="text-xs text-muted-foreground">
          {startDate || endDate
            ? `선택 기간: ${recordCount}건 / 전체 ${totalCount}건`
            : `전체 기간: ${totalCount}건`}
        </p>

        {/* Encryption */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setUseEncryption(!useEncryption)}
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors cursor-pointer ${
                useEncryption ? 'bg-primary border-primary' : 'border-input'
              }`}
            >
              {useEncryption && <span className="text-primary-foreground text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm text-foreground">암호화하여 내보내기</span>
          </label>

          {useEncryption && (
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={password}
                onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="숫자 6자리 암호 입력"
                className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm tracking-widest text-center"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                ⚠️ 암호를 잊으면 파일을 복원할 수 없습니다.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={useEncryption && password.length !== 6}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
        >
          {exportMode === 'json' ? 'JSON 내보내기' : 'CSV 내보내기'}
          {useEncryption ? ' (암호화)' : ''}
        </button>
      </div>

      {/* Import */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">불러오기 (JSON 백업 파일)</p>
        <p className="text-xs text-muted-foreground">
          내보낸 JSON 백업 파일을 불러와 기존 데이터에 병합합니다.
        </p>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">암호화된 파일인 경우</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={importPassword}
            onChange={e => setImportPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="숫자 6자리 암호 입력"
            className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm tracking-widest text-center"
          />
        </div>

        <label className="block w-full py-2.5 bg-muted text-muted-foreground rounded-xl text-center text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors">
          파일 선택하여 불러오기
          <input
            type="file"
            accept=".json,.enc,application/json,application/octet-stream"
            onChange={handleImportFile}
            className="hidden"
          />
        </label>

        {importError && (
          <p className="text-xs text-destructive font-medium">{importError}</p>
        )}
      </div>
    </section>
  );
}
