import Icon from '@/components/ui/icon';

export type DashboardId = 'operations' | 'team' | 'sla';

export interface DashboardTab {
  id: DashboardId;
  label: string;
  icon: string;
  disabled?: boolean;
}

export const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'operations', label: 'Операционный центр', icon: 'LayoutDashboard' },
  { id: 'sla', label: 'SLA и качество', icon: 'Gauge' },
  { id: 'team', label: 'Команда', icon: 'Users', disabled: true },
];

interface DashboardSwitcherProps {
  active: DashboardId;
  onChange: (id: DashboardId) => void;
}

const DashboardSwitcher = ({ active, onChange }: DashboardSwitcherProps) => {
  return (
    <div className="flex justify-end">
      <div className="inline-flex p-1 bg-muted rounded-xl overflow-x-auto max-w-full">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            title={tab.disabled ? 'Скоро' : tab.label}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-medium whitespace-nowrap transition-colors ${
              active === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : tab.disabled
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardSwitcher;