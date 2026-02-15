export const VIOLATION_LABELS: Record<string, string> = {
  group_resolution: 'Бюджет группы (решение)',
  group_response: 'Бюджет группы (реакция)',
  global_resolution: 'Общий SLA (решение)',
  global_response: 'Общий SLA (реакция)',
};

export const formatMinutes = (minutes: number): string => {
  if (!minutes) return '0 мин';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.round(Math.abs(minutes) % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};
