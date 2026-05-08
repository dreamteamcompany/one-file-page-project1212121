/**
 * Хук для обработки массовых операций с заявками
 * Single Responsibility: только логика bulk operations
 */
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { bulkTicketsService } from '@/services/bulkTicketsService';

export const useBulkTicketOperations = (
  selectedTicketIds: number[],
  onSuccess: () => void,
  onClearSelection: () => void
) => {
  const { token, hasPermission, hasSystemRole } = useAuth();
  const { toast } = useToast();

  const requireAdmin = (): boolean => {
    if (!hasSystemRole('admin')) {
      toast({
        title: 'Ошибка',
        description: 'Действие доступно только администраторам',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleChangeStatus = async (statusId: number) => {
    if (!hasPermission('tickets', 'update')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для изменения заявок',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await bulkTicketsService.changeStatus(selectedTicketIds, statusId, token);
      
      toast({
        title: 'Статус изменён',
        description: `Обновлено ${result.successful} из ${result.total} заявок`,
      });
      
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось изменить статус',
        variant: 'destructive',
      });
    }
  };

  const handleChangePriority = async (priorityId: number) => {
    if (!hasPermission('tickets', 'update')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для изменения заявок',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await bulkTicketsService.changePriority(selectedTicketIds, priorityId, token);
      
      toast({
        title: 'Приоритет изменён',
        description: `Обновлено ${result.successful} из ${result.total} заявок`,
      });
      
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось изменить приоритет',
        variant: 'destructive',
      });
    }
  };

  const handleAssign = async (userId: number) => {
    if (!hasPermission('tickets', 'update')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для изменения заявок',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await bulkTicketsService.assignTickets(selectedTicketIds, userId, token);
      
      toast({
        title: 'Заявки назначены',
        description: `Назначено ${result.successful} из ${result.total} заявок`,
      });
      
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось назначить заявки',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!hasPermission('tickets', 'remove')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для удаления заявок',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const result = await bulkTicketsService.deleteTickets(selectedTicketIds, token);
      
      toast({
        title: 'Заявки удалены',
        description: `Удалено ${result.successful} из ${result.total} заявок`,
      });
      
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить заявки',
        variant: 'destructive',
      });
    }
  };

  const handleChangeExecutor = async (userId: number | null) => {
    if (!requireAdmin()) return;
    try {
      const result = await bulkTicketsService.changeExecutor(selectedTicketIds, userId, token!);
      toast({
        title: 'Исполнитель изменён',
        description: `Обновлено ${result.successful} из ${result.total} заявок`,
      });
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сменить исполнителя',
        variant: 'destructive',
      });
    }
  };

  const handleChangeExecutorGroup = async (groupId: number | null) => {
    if (!requireAdmin()) return;
    try {
      const result = await bulkTicketsService.changeExecutorGroup(selectedTicketIds, groupId, token!);
      toast({
        title: 'Группа исполнителей изменена',
        description: `Обновлено ${result.successful} из ${result.total} заявок`,
      });
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сменить группу исполнителей',
        variant: 'destructive',
      });
    }
  };

  const handleAddWatchers = async (userIds: number[]) => {
    if (!requireAdmin()) return;
    if (!userIds.length) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одного наблюдателя',
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await bulkTicketsService.addWatchers(selectedTicketIds, userIds, token!);
      toast({
        title: 'Наблюдатели добавлены',
        description: `Добавлено связей: ${result.inserted ?? 0}`,
      });
      onSuccess();
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить наблюдателей',
        variant: 'destructive',
      });
    }
  };

  return {
    handleChangeStatus,
    handleChangePriority,
    handleAssign,
    handleChangeExecutor,
    handleChangeExecutorGroup,
    handleAddWatchers,
    handleDelete,
  };
};