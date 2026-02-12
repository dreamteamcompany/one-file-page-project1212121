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
import { FieldGroup, Field } from '@/hooks/useCustomFieldGroups';

interface FieldGroupsTableProps {
  fieldGroups: FieldGroup[];
  getFieldById: (id: number) => Field | undefined;
  getFieldTypeIcon: (type: string) => string;
  onEdit: (group: FieldGroup) => void;
  onDelete: (id: number) => void;
}

const FieldGroupsTable = ({
  fieldGroups,
  getFieldById,
  getFieldTypeIcon,
  onEdit,
  onDelete,
}: FieldGroupsTableProps) => {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Поля</TableHead>
            <TableHead className="w-[100px] text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fieldGroups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Нет групп полей
              </TableCell>
            </TableRow>
          ) : (
            fieldGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {group.description || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(!group.fields || group.fields.length === 0) ? (
                      <span className="text-muted-foreground text-sm">Нет полей</span>
                    ) : (
                      group.fields.slice(0, 3).map((field) => (
                        <Badge key={field.id} variant="secondary" className="text-xs">
                          <Icon 
                            name={getFieldTypeIcon(field.field_type)} 
                            size={12} 
                            className="mr-1"
                          />
                          {field.name}
                        </Badge>
                      ))
                    )}
                    {group.fields && group.fields.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{group.fields.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(group)}
                    >
                      <Icon name="Edit" size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(group.id)}
                    >
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

export default FieldGroupsTable;