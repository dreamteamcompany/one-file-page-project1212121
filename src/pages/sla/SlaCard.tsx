import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import SlaGroupBudgetsPreview from '@/components/sla/SlaGroupBudgetsPreview';
import { SLAItem, PriorityTime, formatTime } from './types';

const InfoRow = ({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <Icon name={icon} size={14} className={`${iconColor} shrink-0`} />
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className="text-xs font-medium">{value}</span>
  </div>
);

const PriorityTimesPreview = ({ priorityTimes }: { priorityTimes: PriorityTime[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
          <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} />
          <Icon name="Layers" size={14} />
          <span>Времена по приоритетам ({priorityTimes.length})</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-6 space-y-1.5">
        {priorityTimes.map((pt) => (
          <div key={pt.priority_id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-muted/20">
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.priority_color || '#888' }} />
              <span className="font-medium">{pt.priority_name}</span>
            </div>
            <span className="text-muted-foreground">Реакция: {formatTime(pt.response_time_minutes)}</span>
            <span className="text-muted-foreground">Решение: {formatTime(pt.resolution_time_minutes)}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

const SlaCard = ({
  sla,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  getStatusName,
  canEdit,
  canDelete,
}: {
  sla: SLAItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusName: (id?: number) => string;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const hasPriorityTimes = sla.priority_times && sla.priority_times.length > 0;

  return (
    <Card className="bg-card/50 border-border hover:border-border/80 transition-all">
      <CardContent className="p-0">
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              name={expanded ? 'ChevronDown' : 'ChevronRight'}
              size={16}
              className="text-muted-foreground shrink-0"
            />
            <h3 className="text-base font-semibold truncate">{sla.name}</h3>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon name="Timer" size={12} className="text-primary" />
                {formatTime(sla.response_time_minutes)}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <Icon name="CheckCircle2" size={12} className="text-green-500" />
                {formatTime(sla.resolution_time_minutes)}
              </span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {sla.use_work_schedule && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-500">
                  <Icon name="Clock" size={10} />
                  <span className="hidden sm:inline">Раб. время</span>
                </span>
              )}
              {hasPriorityTimes && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-500">
                  <Icon name="Layers" size={10} />
                  <span className="hidden sm:inline">Приоритеты</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 hover:bg-accent/30">
                <Icon name="Pencil" size={16} />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 hover:bg-red-500/10 text-red-500">
                <Icon name="Trash2" size={16} />
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Реакция</div>
                <InfoRow icon="Timer" iconColor="text-primary" label="Время реакции" value={formatTime(sla.response_time_minutes)} />
                <InfoRow icon="Bell" iconColor="text-yellow-500" label="Уведомление" value={`через ${formatTime(sla.response_notification_minutes)}`} />
                {sla.no_response_minutes && (
                  <InfoRow icon="AlertTriangle" iconColor="text-orange-500" label="Без ответа" value={`${formatTime(sla.no_response_minutes)} → ${getStatusName(sla.no_response_status_id)}`} />
                )}
              </div>
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Решение</div>
                <InfoRow icon="CheckCircle2" iconColor="text-green-500" label="Время решения" value={formatTime(sla.resolution_time_minutes)} />
                <InfoRow icon="Bell" iconColor="text-yellow-500" label="Уведомление" value={`через ${formatTime(sla.resolution_notification_minutes)}`} />
              </div>
            </div>

            {hasPriorityTimes && (
              <PriorityTimesPreview priorityTimes={sla.priority_times!} />
            )}

            <SlaGroupBudgetsPreview slaId={sla.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SlaCard;
