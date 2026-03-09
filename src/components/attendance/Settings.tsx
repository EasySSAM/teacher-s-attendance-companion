import React, { useState } from 'react';
import { Student, AttendanceRecord, DaySchedule, Type1, TYPE1_OPTIONS } from '@/types/attendance';
import { TrashIcon, PlusIcon, EditIcon } from './Icons';
import { generateId } from '@/utils/attendance';
import DataBackup from './DataBackup';
import { getPinEnabled, getStoredPin, setStoredPin, clearStoredPin } from './LockScreen';

interface SettingsProps {
  students: Student[];
  records: AttendanceRecord[];
  schedule: DaySchedule;
  warningPhrases: string[];
  yearlyExcludeTypes: Type1[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onBulkAddStudents: (students: Student[]) => void;
  onDeleteAllStudents: () => void;
  onImportData: (students: Student[], records: AttendanceRecord[]) => void;
  onUpdateSchedule: (schedule: DaySchedule) => void;
  onUpdateWarningPhrases: (phrases: string[]) => void;
  onUpdateYearlyExcludeTypes: (types: Type1[]) => void;
}

function AppLockSettings() {
  const [lockEnabled, setLockEnabled] = useState(getPinEnabled());
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const handleToggle = () => {
    if (lockEnabled) {
      clearStoredPin();
      setLockEnabled(false);
    } else {
      setShowSetPin(true);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
    }
  };

  const handleSetPin = () => {
    if (newPin.length !== 4) { setPinError('4자리를 입력하세요'); return; }
    if (newPin !== confirmPin) { setPinError('비밀번호가 일치하지 않습니다'); return; }
    setStoredPin(newPin);
    setLockEnabled(true);
    setShowSetPin(false);
  };

  const handleChangePin = () => {
    setShowSetPin(true);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  return (
    <section>
      <h3 className="font-semibold text-foreground mb-3">앱 잠금</h3>
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">비밀번호 잠금</p>
            <p className="text-xs text-muted-foreground">앱 실행 시 4자리 비밀번호 입력</p>
          </div>
          <button
            onClick={handleToggle}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              lockEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-card shadow transition-transform ${
              lockEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {lockEnabled && !showSetPin && (
          <button
            onClick={handleChangePin}
            className="text-xs text-primary font-medium hover:underline"
          >
            비밀번호 변경
          </button>
        )}

        {showSetPin && (
          <div className="space-y-2 pt-2 border-t border-border">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="새 비밀번호 (숫자 4자리)"
              className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm tracking-widest text-center"
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="비밀번호 확인"
              className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-sm tracking-widest text-center"
            />
            {pinError && <p className="text-xs text-destructive font-medium">{pinError}</p>}
            <div className="flex gap-2">
              <button onClick={handleSetPin} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">설정</button>
              <button onClick={() => setShowSetPin(false)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium">취소</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Settings({
  students,
  records,
  schedule,
  warningPhrases,
  yearlyExcludeTypes,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkAddStudents,
  onDeleteAllStudents,
  onImportData,
  onUpdateSchedule,
  onUpdateWarningPhrases,
  onUpdateYearlyExcludeTypes,
}: SettingsProps) {
  const [settingsTab, setSettingsTab] = useState<'students' | 'attendance' | 'data'>('students');
  const [bulkText, setBulkText] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [transferModal, setTransferModal] = useState<{ type: 'in' | 'out'; studentId: string } | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const days = ['월', '화', '수', '목', '금'];

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.trim().split('\n');
    const parsed: Student[] = [];
    for (const line of lines) {
      const cols = line.split(/[,\t]/).map(c => c.trim().replace(/"/g, ''));
      const num = parseInt(cols[0]);
      if (isNaN(num)) continue;
      const name = cols[1]?.trim();
      if (!name) continue;
      let gender: 'male' | 'female' = 'male';
      const genderStr = cols[2]?.trim();
      if (genderStr === '여' || genderStr === '여자' || genderStr === '여학생' || genderStr === 'F' || genderStr === 'female') {
        gender = 'female';
      }
      parsed.push({ id: generateId() + num, number: num, name, gender });
    }
    if (parsed.length > 0) {
      onBulkAddStudents(parsed);
      setBulkText('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setBulkText(ev.target?.result as string || ''); };
    reader.readAsText(file);
  };

  const handleAddSingle = () => {
    const num = parseInt(newNumber);
    if (isNaN(num) || !newName.trim() || !newGender) return;
    onAddStudent({ id: generateId(), number: num, name: newName.trim(), gender: newGender as 'male' | 'female' });
    setNewNumber(''); setNewName(''); setNewGender('');
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id); setEditNumber(String(student.number)); setEditName(student.name); setEditGender(student.gender);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const num = parseInt(editNumber);
    if (isNaN(num) || !editName.trim()) return;
    onUpdateStudent(editingId, { number: num, name: editName.trim(), gender: editGender });
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`${name} 학생의 모든 데이터가 삭제됩니다. 계속하시겠습니까?`)) {
      onDeleteStudent(id);
    }
  };

  const handleTransfer = () => {
    if (!transferModal || !transferDate) return;
    if (transferModal.type === 'out') {
      onUpdateStudent(transferModal.studentId, { transferOutDate: transferDate });
    } else {
      onUpdateStudent(transferModal.studentId, { transferInDate: transferDate });
    }
    setTransferModal(null); setTransferDate('');
  };

  const settingsTabs = [
    { key: 'students' as const, label: '학생 관리' },
    { key: 'attendance' as const, label: '출결 설정' },
    { key: 'data' as const, label: '데이터' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-border bg-card shrink-0">
        {settingsTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              settingsTab === tab.key ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {tab.label}
            {settingsTab === tab.key && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* ===== 학생 관리 탭 ===== */}
          {settingsTab === 'students' && (
            <>
              {/* Bulk import */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">일괄 등록</h3>
                <div className="bg-accent rounded-2xl p-4 text-sm mb-3">
                  <p className="font-semibold text-accent-foreground mb-1">나이스 명렬표 파일 등록</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    경로: 나이스 → [기본학적관리] → [명렬표출력] → '조회' 클릭 → '명렬표 내용 선택' 클릭 → '성별' 추가 → 엑셀 파일 다운로드
                  </p>
                  <p className="text-xs text-muted-foreground">
                    엑셀 파일을 '다른 이름으로 저장'하면서 '파일 형식'을 'CSV UTF-8(쉼표로 분리)'로 지정하여 저장해 주세요.
                  </p>
                </div>
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  rows={4}
                  placeholder={"1,가가가,남\n2,나나나,여\n..."}
                  className="w-full p-3 rounded-xl border border-input bg-background text-foreground text-sm resize-none mb-2"
                />
                <div className="flex gap-2">
                  <label className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-center text-sm font-medium cursor-pointer hover:bg-muted/80 transition-colors">
                    파일 선택
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    onClick={handleBulkAdd}
                    disabled={!bulkText.trim()}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
                  >
                    일괄 등록하기
                  </button>
                </div>
              </section>

              {/* Individual add */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">개별 추가</h3>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newNumber}
                      onChange={e => setNewNumber(e.target.value)}
                      placeholder="번호"
                      className="w-20 p-2.5 pr-1 rounded-xl border border-input bg-background text-foreground text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:opacity-100 [&::-webkit-inner-spin-button]:opacity-100"
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="이름"
                      className="flex-1 min-w-0 p-2.5 rounded-xl border border-input bg-background text-foreground text-sm"
                    />
                    <div className="flex shrink-0 rounded-xl border border-input overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setNewGender('male')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                          newGender === 'male'
                            ? 'bg-gender-male text-gender-male-text'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        남
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGender('female')}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                          newGender === 'female'
                            ? 'bg-gender-female text-gender-female-text'
                            : 'bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        여
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleAddSingle}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
                  >
                    추가하기
                  </button>
                </div>
              </section>

              {/* Student list */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">학생 명단 ({students.length}명)</h3>
                  {students.length > 0 && (
                    <button
                      onClick={() => setShowDeleteAllModal(true)}
                      className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-semibold hover:bg-destructive/20 transition-colors"
                    >
                      일괄 삭제
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {students.map(student => (
                    <div key={student.id} className="bg-card border border-border rounded-2xl p-3">
                      {editingId === student.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <input type="number" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="p-2 rounded-xl border border-input bg-background text-foreground text-sm" />
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="p-2 rounded-xl border border-input bg-background text-foreground text-sm" />
                            <select value={editGender} onChange={e => setEditGender(e.target.value as 'male' | 'female')} className="p-2 rounded-xl border border-input bg-background text-foreground text-sm">
                              <option value="male">남학생</option>
                              <option value="female">여학생</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSaveEdit} className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold">수정하기</button>
                            <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-medium">취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-xs font-medium ${
                              student.gender === 'male' ? 'bg-gender-male text-gender-male-text' : 'bg-gender-female text-gender-female-text'
                            }`}>{student.number}</span>
                            <span className="font-medium text-sm text-foreground truncate">{student.name}</span>
                            {student.transferOutDate && (
                              <span className="shrink-0 text-[10px] text-att-unexcused bg-att-unexcused-bg px-1 py-0.5 rounded">전출</span>
                            )}
                            {student.transferInDate && (
                              <span className="shrink-0 text-[10px] text-att-approved bg-att-approved-bg px-1 py-0.5 rounded">전입</span>
                            )}
                          </div>
                          <div className="flex items-center shrink-0">
                            <button onClick={() => setTransferModal({ type: 'out', studentId: student.id })} className="px-1.5 py-1 text-[10px] rounded-lg bg-att-sick-bg text-att-sick font-medium">전출</button>
                            <button onClick={() => setTransferModal({ type: 'in', studentId: student.id })} className="px-1.5 py-1 text-[10px] rounded-lg bg-att-approved-bg text-att-approved font-medium">전입</button>
                            <button onClick={() => handleEdit(student)} className="p-1 rounded-lg hover:bg-muted transition-colors"><EditIcon className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(student.id, student.name)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"><TrashIcon className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* ===== 출결 설정 탭 ===== */}
          {settingsTab === 'attendance' && (
            <>
              {/* Schedule */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">요일별 교시 설정</h3>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="grid grid-cols-5 gap-2">
                    {days.map(day => (
                      <div key={day} className="text-center">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">{day}</label>
                        <select
                          value={schedule[day] || 7}
                          onChange={e => onUpdateSchedule({ ...schedule, [day]: parseInt(e.target.value) })}
                          className="w-full p-2 rounded-xl border border-input bg-background text-foreground text-center text-sm"
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Warning phrases */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">경고 문구 설정</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  설정한 문구가 사유에 포함되어 있고, 같은 달에 동일 문구로 기록이 있으면 저장 시 경고 팝업이 표시됩니다.
                </p>
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPhrase}
                      onChange={e => setNewPhrase(e.target.value)}
                      placeholder="예: 생리통, 병원"
                      className="flex-1 min-w-0 p-2.5 rounded-xl border border-input bg-background text-foreground text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newPhrase.trim()) {
                          onUpdateWarningPhrases([...warningPhrases, newPhrase.trim()]);
                          setNewPhrase('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newPhrase.trim()) {
                          onUpdateWarningPhrases([...warningPhrases, newPhrase.trim()]);
                          setNewPhrase('');
                        }
                      }}
                      className="shrink-0 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
                    >
                      추가
                    </button>
                  </div>
                  {warningPhrases.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {warningPhrases.map((phrase, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-att-sick-bg text-att-sick rounded-full text-sm font-medium"
                        >
                          {phrase}
                          <button
                            onClick={() => onUpdateWarningPhrases(warningPhrases.filter((_, j) => j !== i))}
                            className="hover:opacity-70"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Yearly exclude types */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">연간 누적 필터 설정</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  연간(누적) 통계에서 카운팅에서 제외할 출결 구분을 선택하세요. 개근상·정근상 판단 기준으로 활용됩니다.
                </p>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <div className="space-y-2">
                    {TYPE1_OPTIONS.map(type => {
                      const isExcluded = yearlyExcludeTypes.includes(type);
                      return (
                        <label key={type} className="flex items-center gap-3 cursor-pointer">
                          <div
                            onClick={() => {
                              const newTypes = isExcluded
                                ? yearlyExcludeTypes.filter(t => t !== type)
                                : [...yearlyExcludeTypes, type];
                              onUpdateYearlyExcludeTypes(newTypes);
                            }}
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors cursor-pointer ${
                              isExcluded ? 'bg-primary border-primary' : 'border-input'
                            }`}
                          >
                            {isExcluded && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                          </div>
                          <span className="text-sm text-foreground">{type}</span>
                          <span className="text-xs text-muted-foreground">
                            {isExcluded ? '(제외)' : '(포함)'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* App Lock */}
              <AppLockSettings />
            </>
          )}

          {/* ===== 데이터 탭 ===== */}
          {settingsTab === 'data' && (
            <>
              <DataBackup
                students={students}
                records={records}
                onImportData={onImportData}
              />

              {/* App info */}
              <section className="mt-8 pt-6 border-t border-border">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                    <span className="text-xs font-semibold text-foreground">출결 관리 앱</span>
                    <span className="text-[10px] text-muted-foreground font-mono">v2026.03.08</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      제작 · <span className="font-medium text-foreground">Easy쌤</span>
                    </p>
                    <a
                      href="https://blog.naver.com/ai_korean_t"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      blog.naver.com/ai_korean_t
                    </a>
                  </div>
                </div>
              </section>
            </>
          )}

        </div>
      </div>

      {/* Transfer modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setTransferModal(null)} />
          <div className="relative w-full max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden bg-card rounded-2xl p-5 shadow-2xl animate-slide-up">
            <h3 className="font-semibold text-foreground mb-4">
              {transferModal.type === 'out' ? '전출일 입력' : '전입일 입력'}
            </h3>
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              className="block w-full min-w-0 h-14 px-4 rounded-xl border border-input bg-background text-foreground mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleTransfer} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">확인</button>
              <button onClick={() => setTransferModal(null)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium text-sm">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmText(''); }} />
          <div className="relative bg-card rounded-2xl p-6 w-80 shadow-2xl animate-slide-up">
            <h3 className="font-semibold text-destructive mb-2">⚠️ 학생 명단 일괄 삭제</h3>
            <p className="text-sm text-muted-foreground mb-1">
              모든 학생과 출결 기록이 영구적으로 삭제됩니다.
            </p>
            <p className="text-sm text-foreground font-medium mb-3">
              계속하려면 아래에 <span className="text-destructive font-bold">삭제합니다</span>를 입력하세요.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="삭제합니다"
              className="w-full p-3 rounded-xl border border-input bg-background text-foreground mb-4 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (deleteConfirmText === '삭제합니다') {
                    onDeleteAllStudents();
                    setShowDeleteAllModal(false);
                    setDeleteConfirmText('');
                  }
                }}
                disabled={deleteConfirmText !== '삭제합니다'}
                className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-semibold text-sm disabled:opacity-40 transition-opacity"
              >
                삭제
              </button>
              <button
                onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl font-medium text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
