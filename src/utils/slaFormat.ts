/**
 * Форматирование оставшегося времени SLA в компактный бейдж: «2ч 16м», «1д 2ч», «Просрочено».
 */
import { getMskTimestamp } from '@/utils/dateFormat';

export interface SlaBadge {
  text: string;
  overdue: boolean;
  color: 'red' | 'orange' | 'yellow' | 'green';
}

export const getSlaBadge = (dueDate?: string | null): SlaBadge | null => {
  if (!dueDate) return null;
  const due = getMskTimestamp(dueDate);
  if (!due) return null;

  const timeLeft = due - Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (timeLeft < 0) {
    return { text: 'Просрочено', overdue: true, color: 'red' };
  }

  const days = Math.floor(timeLeft / oneDay);
  const hours = Math.floor((timeLeft % oneDay) / oneHour);
  const minutes = Math.floor((timeLeft % oneHour) / (60 * 1000));

  let text: string;
  if (days > 0) {
    text = `${days}д ${hours}ч`;
  } else if (hours > 0) {
    text = `${hours}ч ${minutes}м`;
  } else {
    text = `${minutes}м`;
  }

  let color: SlaBadge['color'];
  if (timeLeft < 3 * oneHour) color = 'red';
  else if (timeLeft < oneDay) color = 'orange';
  else if (timeLeft < 2 * oneDay) color = 'yellow';
  else color = 'green';

  return { text, overdue: false, color };
};

export const SLA_BADGE_CLASSES: Record<SlaBadge['color'], string> = {
  red: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
};

export const SLA_BAR_COLORS: Record<SlaBadge['color'], string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
};
