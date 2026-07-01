/**
 * Хук выбора интерфейса страницы заявок.
 * 'classic' — существующий интерфейс, 'workspace' — новый (рабочее место оператора).
 * Выбор сохраняется в localStorage и не слетает после перезагрузки.
 */
import { useState, useCallback } from 'react';

export type TicketsInterface = 'classic' | 'workspace';

const STORAGE_KEY = 'tickets_interface';

const readInitial = (): TicketsInterface => {
  if (typeof window === 'undefined') return 'classic';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'workspace' ? 'workspace' : 'classic';
};

export const useTicketsInterface = () => {
  const [ui, setUi] = useState<TicketsInterface>(readInitial);

  const setInterface = useCallback((next: TicketsInterface) => {
    setUi(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage может быть недоступен — не критично */
    }
  }, []);

  const toggleInterface = useCallback(() => {
    setInterface(ui === 'classic' ? 'workspace' : 'classic');
  }, [ui, setInterface]);

  return { ui, setInterface, toggleInterface };
};
