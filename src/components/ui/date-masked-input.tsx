import * as React from 'react';
import { Input } from '@/components/ui/input';

interface DateMaskedInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (isoDate: string) => void;
}

const MASK = 'ДД.ММ.ГГГГ';

const isoToDisplay = (iso: string): string => {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}.${match[2]}.${match[1]}`;
};

const displayToIso = (display: string): string => {
  const match = display.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return '';
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const applyMask = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '.';
    result += digits[i];
  }
  return result;
};

const DateMaskedInput = React.forwardRef<HTMLInputElement, DateMaskedInputProps>(
  ({ value, onChange, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => isoToDisplay(value));

    React.useEffect(() => {
      setDisplayValue(isoToDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value);
      setDisplayValue(masked);

      if (masked.length === 10) {
        const iso = displayToIso(masked);
        if (iso) onChange(iso);
      } else if (masked.length === 0) {
        onChange('');
      }
    };

    const handleBlur = () => {
      if (displayValue.length > 0 && displayValue.length < 10) {
        setDisplayValue(isoToDisplay(value));
      }
    };

    return (
      <Input
        ref={ref}
        inputMode="numeric"
        placeholder={placeholder || MASK}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={10}
        {...props}
      />
    );
  }
);

DateMaskedInput.displayName = 'DateMaskedInput';

export { DateMaskedInput, isoToDisplay };
export default DateMaskedInput;
