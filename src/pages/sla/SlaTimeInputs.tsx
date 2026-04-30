import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TimeInput = ({ label, value, onChange, description }: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  description?: string;
}) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Label htmlFor={`${label}-hours`} className="text-xs text-muted-foreground">Часы</Label>
          <Input
            id={`${label}-hours`}
            type="number"
            min="0"
            value={hours}
            onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + minutes)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor={`${label}-minutes`} className="text-xs text-muted-foreground">Минуты</Label>
          <Input
            id={`${label}-minutes`}
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => onChange(hours * 60 + (parseInt(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export const CompactTimeInput = ({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
}) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1 items-center">
        <Input
          type="number"
          min="0"
          className="w-16 h-8 text-xs"
          placeholder="ч"
          value={hours || ''}
          onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + minutes)}
        />
        <span className="text-xs text-muted-foreground">ч</span>
        <Input
          type="number"
          min="0"
          max="59"
          className="w-16 h-8 text-xs"
          placeholder="мин"
          value={minutes || ''}
          onChange={(e) => onChange(hours * 60 + (parseInt(e.target.value) || 0))}
        />
        <span className="text-xs text-muted-foreground">мин</span>
      </div>
    </div>
  );
};
