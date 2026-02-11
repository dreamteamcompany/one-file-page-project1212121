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
import type { TicketService } from '@/hooks/useTicketServices';

interface TicketServicesTableProps {
  ticketServices: TicketService[];
  loading: boolean;
  onEdit: (service: TicketService) => void;
  onDelete: (id: number) => void;
}

const TicketServicesTable = ({
  ticketServices,
  loading,
  onEdit,
  onDelete,
}: TicketServicesTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (ticketServices.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="PackageOpen" className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Нет услуг</h3>
        <p className="text-sm text-muted-foreground">
          Создайте первую услугу заявки
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Название</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Заголовок заявки</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ticketServices.map((ticketService) => (
          <TableRow key={ticketService.id}>
            <TableCell>
              <div>
                <div className="font-medium">{ticketService.name}</div>
                {ticketService.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {ticketService.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              {ticketService.category_name ? (
                <Badge variant="outline">{ticketService.category_name}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Не указана</span>
              )}
            </TableCell>
            <TableCell>
              {ticketService.ticket_title || (
                <span className="text-sm text-muted-foreground">Не указан</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(ticketService)}
                >
                  <Icon name="Pencil" className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(ticketService.id)}
                >
                  <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TicketServicesTable;
