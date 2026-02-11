import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { TicketTemplate } from '@/hooks/useTicketTemplates';

interface TemplatesTableProps {
  templates: TicketTemplate[];
  onEdit: (template: TicketTemplate) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}

const TemplatesTable = ({ templates, onEdit, onDelete, loading }: TemplatesTableProps) => {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead className="w-[180px]">Услуга</TableHead>
            <TableHead className="w-[200px]">Сервисы</TableHead>
            <TableHead className="w-[100px]">SLA</TableHead>
            <TableHead className="w-[120px]">Приоритет</TableHead>
            <TableHead className="w-[100px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Нет шаблонов заявок
              </TableCell>
            </TableRow>
          ) : (
            templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {template.description || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {template.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {template.category_name}
                      </Badge>
                    )}
                    <span className="text-sm">{template.service_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {template.ticket_service_names && template.ticket_service_names.length > 0 ? (
                      <>
                        {template.ticket_service_names.slice(0, 2).map((name, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {template.ticket_service_names.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.ticket_service_names.length - 2}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Нет сервисов</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Icon name="Clock" size={14} className="text-muted-foreground" />
                    <span>{template.sla_hours}ч</span>
                  </div>
                </TableCell>
                <TableCell>
                  {template.priority_name ? (
                    <Badge variant="secondary" className="text-xs">
                      {template.priority_name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(template)}>
                      <Icon name="Edit" size={16} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(template.id)}>
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TemplatesTable;
