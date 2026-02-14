import * as React from 'react';
import { Input } from '@/components/ui/input';

interface PhoneMaskedInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (phone: string) => void;
}

const MASK = '+7 (___) ___ __ __';

const applyMask = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  if (digits.startsWith('7')) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  let result = '+7';
  if (digits.length > 0) result += ` (${digits.slice(0, 3)}`;
  if (digits.length >= 3) result += ')';
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += ` ${digits.slice(6, 8)}`;
  if (digits.length > 8) result += ` ${digits.slice(8, 10)}`;

  return result;
};

const formatForStorage = (display: string): string => {
  const digits = display.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`;
  }
  return display;
};

const displayFromStorage = (stored: string): string => {
  if (!stored) return '';
  const digits = stored.replace(/\D/g, '');
  if (digits.length >= 1) {
    return applyMask(digits);
  }
  return stored;
};

const PhoneMaskedInput = React.forwardRef<HTMLInputElement, PhoneMaskedInputProps>(
  ({ value, onChange, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => displayFromStorage(value));

    React.useEffect(() => {
      setDisplayValue(displayFromStorage(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value);
      setDisplayValue(masked);

      const digits = masked.replace(/\D/g, '');
      if (digits.length === 11) {
        onChange(formatForStorage(masked));
      } else if (digits.length === 0 || masked === '+7') {
        onChange('');
      }
    };

    const handleFocus = () => {
      if (!displayValue) {
        setDisplayValue('+7');
      }
    };

    const handleBlur = () => {
      if (displayValue === '+7' || displayValue === '+7 (') {
        setDisplayValue('');
        onChange('');
      }
    };

    return (
      <Input
        ref={ref}
        inputMode="tel"
        placeholder={placeholder || MASK}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

PhoneMaskedInput.displayName = 'PhoneMaskedInput';

export { PhoneMaskedInput, displayFromStorage };
export default PhoneMaskedInput;
