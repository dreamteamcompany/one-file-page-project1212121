import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Service } from '@/hooks/useServices';

interface ServicesTableProps {
  services: Service[];
  loading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
}

const ServicesTable = ({ services, loading, onEdit, onDelete }: ServicesTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Все сервисы</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {loading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет созданных сервисов
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Отдел-заказчик</TableHead>
                  <TableHead>Промежуточное согласование</TableHead>
                  <TableHead>Окончательное согласование</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      {service.category_name ? (
                        <div className="flex items-center gap-2">
                          <Icon name={service.category_icon || 'Tag'} size={16} />
                          {service.category_name}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{service.description || '—'}</TableCell>
                    <TableCell>{service.customer_department_name || '—'}</TableCell>
                    <TableCell>{service.intermediate_approver_name || '—'}</TableCell>
                    <TableCell>{service.final_approver_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(service)}
                        >
                          <Icon name="Pencil" size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(service.id)}
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicesTable;
