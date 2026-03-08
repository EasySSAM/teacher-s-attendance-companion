import React, { useState } from 'react';
import { useAttendanceStore } from '@/hooks/useAttendanceStore';
import DailyView from '@/components/attendance/DailyView';
import Statistics from '@/components/attendance/Statistics';
import NaisCheck from '@/components/attendance/NaisCheck';
import Settings from '@/components/attendance/Settings';
import { CalendarIcon, BarChart2Icon, SearchIcon, SettingsIcon } from '@/components/attendance/Icons';

type Tab = 'daily' | 'stats' | 'nais' | 'settings';

const tabs: { key: Tab; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'daily', label: '일별조회', Icon: CalendarIcon },
  { key: 'stats', label: '통계', Icon: BarChart2Icon },
  { key: 'nais', label: '나이스점검', Icon: SearchIcon },
  { key: 'settings', label: '설정', Icon: SettingsIcon },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const store = useAttendanceStore();

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'daily' && (
          <DailyView
            students={store.students}
            records={store.records}
            schedule={store.schedule}
            getActiveStudents={store.getActiveStudents}
            getRecordsForDate={store.getRecordsForDate}
            getFrequentReasons={store.getFrequentReasons}
            warningPhrases={store.warningPhrases}
            onAddRecord={store.addRecord}
            onUpdateRecord={store.updateRecord}
            onDeleteRecord={store.deleteRecord}
          />
        )}
        {activeTab === 'stats' && (
          <Statistics
            students={store.students}
            records={store.records}
            yearlyExcludeTypes={store.yearlyExcludeTypes}
            schedule={store.schedule}
            warningPhrases={store.warningPhrases}
            frequentReasons={store.getFrequentReasons()}
            onUpdateRecord={store.updateRecord}
            onAddRecord={store.addRecord}
          />
        )}
        {activeTab === 'nais' && (
          <NaisCheck
            students={store.students}
            records={store.records}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            students={store.students}
            schedule={store.schedule}
            warningPhrases={store.warningPhrases}
            yearlyExcludeTypes={store.yearlyExcludeTypes}
            onAddStudent={store.addStudent}
            onUpdateStudent={store.updateStudent}
            onDeleteStudent={store.deleteStudent}
            onBulkAddStudents={store.bulkAddStudents}
            onUpdateSchedule={store.updateSchedule}
            onUpdateWarningPhrases={store.updateWarningPhrases}
            onUpdateYearlyExcludeTypes={store.updateYearlyExcludeTypes}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="bg-card border-t border-border safe-bottom">
        <div className="flex">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                activeTab === key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Index;
