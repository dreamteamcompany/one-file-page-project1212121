/**
 * Переключатель интерфейсов страницы заявок: классический ↔ рабочее место оператора.
 * Две квадратные кнопки-иконки, выбор запоминается родителем (localStorage).
 */
import Icon from '@/components/ui/icon';
import type { TicketsInterface } from '@/hooks/useTicketsInterface';

interface InterfaceSwitcherProps {
  value: TicketsInterface;
  onChange: (next: TicketsInterface) => void;
}

const InterfaceSwitcher = ({ value, onChange }: InterfaceSwitcherProps) => {
  const options: { key: TicketsInterface; icon: string; title: string }[] = [
    { key: 'classic', icon: 'LayoutList', title: 'Классический интерфейс' },
    { key: 'workspace', icon: 'PanelsTopLeft', title: 'Рабочее место оператора' },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            title={opt.title}
            aria-pressed={active}
            onClick={() => onChange(opt.key)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon name={opt.icon} size={18} />
          </button>
        );
      })}
    </div>
  );
};

export default InterfaceSwitcher;
