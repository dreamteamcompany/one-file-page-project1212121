import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface TicketTemplate {
  id: number;
  name: string;
  description: string;
  service_id: number;
  service_name?: string;
  ticket_service_ids: number[];
  ticket_service_names?: string[];
  sla_hours: number;
  priority_id?: number;
  priority_name?: string;
  category_id?: number;
  category_name?: string;
}

interface TicketFormStep0Props {
  templates: TicketTemplate[];
  onSelectTemplate: (template: TicketTemplate) => void;
  onSkip: () => void;
  onBack: () => void;
}

const TicketFormStep0 = ({
  templates,
  onSelectTemplate,
  onSkip,
  onBack,
}: TicketFormStep0Props) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (template.service_name &&
        template.service_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Icon
            name="Search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Поиск шаблонов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] border rounded-lg p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'Шаблоны не найдены' : 'Нет доступных шаблонов'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {template.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {template.category_name}
                      </Badge>
                    )}
                    {template.service_name && (
                      <Badge variant="secondary" className="text-xs">
                        {template.service_name}
                      </Badge>
                    )}
                    {template.priority_name && (
                      <Badge variant="default" className="text-xs">
                        {template.priority_name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon name="Clock" size={12} />
                      <span>SLA: {template.sla_hours}ч</span>
                    </div>
                  </div>

                  {template.ticket_service_names &&
                    template.ticket_service_names.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Сервисы:</span>
                        {template.ticket_service_names.slice(0, 3).map((name, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {template.ticket_service_names.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.ticket_service_names.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
          Пропустить (создать вручную)
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

export default TicketFormStep0;
