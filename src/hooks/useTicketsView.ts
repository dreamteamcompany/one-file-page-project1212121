/**
 * Хук для управления режимом просмотра заявок
 * Single Responsibility: только переключение list/kanban и bulk mode
 */
import { useState } from 'react';

export const useTicketsView = () => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [bulkMode, setBulkMode] = useState(false);

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
  };

  const disableBulkMode = () => {
    setBulkMode(false);
  };

  return {
    viewMode,
    setViewMode,
    bulkMode,
    toggleBulkMode,
    disableBulkMode
  };
};
