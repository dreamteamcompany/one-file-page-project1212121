import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface InlineMinutesInputProps {
  label: string;
  value: number | null;
  onChange: (minutes: number | null) => void;
  invalid?: boolean;
  description?: string;
}

const InlineMinutesInput = ({
  label,
  value,
  onChange,
  invalid,
  description,
}: InlineMinutesInputProps) => {
  const hours = value ? Math.floor(value / 60) : 0;
  const minutes = value ? value % 60 : 0;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Label className="text-sm text-foreground truncate">{label}</Label>
        {description && (
          <span
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-help"
            title={description}
          >
            <Icon name="Info" size={13} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Input
          type="number"
          min="0"
          className={`w-14 h-8 text-sm text-center px-1 ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          placeholder="0"
          value={hours || ''}
          onChange={(e) => {
            const h = parseInt(e.target.value) || 0;
            onChange(h * 60 + minutes);
          }}
        />
        <span className="text-xs text-muted-foreground">ч</span>
        <Input
          type="number"
          min="0"
          max="59"
          className={`w-14 h-8 text-sm text-center px-1 ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          placeholder="0"
          value={minutes || ''}
          onChange={(e) => {
            const m = parseInt(e.target.value) || 0;
            onChange(hours * 60 + m);
          }}
        />
        <span className="text-xs text-muted-foreground">мин</span>
      </div>
    </div>
  );
};

export default InlineMinutesInput;
