const MSK_TIMEZONE = 'Europe/Moscow';

const parseAsUtc = (input?: string | number | Date | null): Date | null => {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  let s = String(input).trim();
  if (!s) return null;

  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  if (!hasTz) {
    s = s.replace(' ', 'T') + 'Z';
  } else if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const parseServerDate = (input?: string | number | Date | null): Date | null => parseAsUtc(input);

export const formatDateMSK = (input?: string | number | Date | null, withYear = false): string => {
  const d = parseAsUtc(input);
  if (!d) return '';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIMEZONE,
  });
};

export const formatDateTimeMSK = (input?: string | number | Date | null): string => {
  const d = parseAsUtc(input);
  if (!d) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIMEZONE,
  });
};

export const formatDateOnlyMSK = (input?: string | number | Date | null, opts?: { longMonth?: boolean; withYear?: boolean }): string => {
  const d = parseAsUtc(input);
  if (!d) return '';
  return d.toLocaleDateString('ru-RU', {
    day: opts?.longMonth ? 'numeric' : '2-digit',
    month: opts?.longMonth ? 'long' : '2-digit',
    ...(opts?.withYear ?? true ? { year: 'numeric' } : {}),
    timeZone: MSK_TIMEZONE,
  });
};

export const formatTimeMSK = (input?: string | number | Date | null): string => {
  const d = parseAsUtc(input);
  if (!d) return '';
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TIMEZONE,
  });
};

export const getMskHourMinute = (input?: string | number | Date | null): { hour: string; minute: string } => {
  const d = parseAsUtc(input);
  if (!d) return { hour: '00', minute: '00' };
  const parts = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MSK_TIMEZONE,
  }).formatToParts(d);
  return {
    hour: parts.find((p) => p.type === 'hour')?.value || '00',
    minute: parts.find((p) => p.type === 'minute')?.value || '00',
  };
};

export const getMskTimestamp = (input?: string | number | Date | null): number => {
  const d = parseAsUtc(input);
  return d ? d.getTime() : 0;
};
