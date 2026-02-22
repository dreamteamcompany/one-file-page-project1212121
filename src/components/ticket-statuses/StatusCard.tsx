import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import type { TicketStatus } from '@/hooks/useTicketStatuses';

interface StatusCardProps {
  status: TicketStatus;
  onEdit: (status: TicketStatus) => void;
  onDelete: (id: number) => void;
}

const StatusCard = ({ status, onEdit, onDelete }: StatusCardProps) => {
  return (
    <Card className="bg-card border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: status.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{status.name}</h3>
              {status.is_open && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  <Icon name="Unlock" size={12} className="inline mr-1" />
                  Открытый статус
                </p>
              )}
              {status.is_approval && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  <Icon name="FileCheck" size={12} className="inline mr-1" />
                  Согласующий статус
                </p>
              )}
              {status.is_approved && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  <Icon name="CheckCircle" size={12} className="inline mr-1" />
                  Согласовано
                </p>
              )}
              {status.is_approval_revoked && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  <Icon name="XCircle" size={12} className="inline mr-1" />
                  Согласование отозвано
                </p>
              )}
              {status.is_awaiting_confirmation && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  <Icon name="ClipboardCheck" size={12} className="inline mr-1" />
                  Подтверждение выполнения
                </p>
              )}
              {status.is_closed && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Icon name="Lock" size={12} className="inline mr-1" />
                  Закрытый статус
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(status)}
              className="h-8 w-8 p-0"
            >
              <Icon name="Pencil" size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(status.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
            >
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${status.color}20`,
              color: status.color 
            }}
          >
            Превью статуса
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusCard;