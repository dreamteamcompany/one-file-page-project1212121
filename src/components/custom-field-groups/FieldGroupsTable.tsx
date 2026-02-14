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
import { Card } from '@/components/ui/card';
import { FieldGroup, Field } from '@/hooks/useCustomFieldGroups';

interface FieldGroupsTableProps {
  fieldGroups: FieldGroup[];
  getFieldById: (id: number) => Field | undefined;
  getFieldTypeIcon: (type: string) => string;
  onEdit: (group: FieldGroup) => void;
  onDelete: (id: number) => void;
}

const FieldBadges = ({
  fields,
  getFieldTypeIcon,
}: {
  fields?: { id: number; name: string; field_type: string }[];
  getFieldTypeIcon: (type: string) => string;
}) => {
  if (!fields || fields.length === 0) {
    return <span className="text-muted-foreground text-sm">Нет полей</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {fields.slice(0, 3).map((field) => (
        <Badge key={field.id} variant="secondary" className="text-xs">
          <Icon name={getFieldTypeIcon(field.field_type)} size={12} className="mr-1" />
          {field.name}
        </Badge>
      ))}
      {fields.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{fields.length - 3}
        </Badge>
      )}
    </div>
  );
};

const ActionButtons = ({
  group,
  onEdit,
  onDelete,
}: {
  group: FieldGroup;
  onEdit: (group: FieldGroup) => void;
  onDelete: (id: number) => void;
}) => (
  <div className="flex gap-2">
    <Button size="sm" variant="ghost" onClick={() => onEdit(group)}>
      <Icon name="Edit" size={16} />
    </Button>
    <Button size="sm" variant="ghost" onClick={() => onDelete(group.id)}>
      <Icon name="Trash2" size={16} />
    </Button>
  </div>
);

const MobileCards = ({
  fieldGroups,
  getFieldTypeIcon,
  onEdit,
  onDelete,
}: Omit<FieldGroupsTableProps, 'getFieldById'>) => {
  if (fieldGroups.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Нет групп полей
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fieldGroups.map((group) => (
        <Card key={group.id} className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{group.name}</h3>
              {group.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
              )}
            </div>
            <ActionButtons group={group} onEdit={onEdit} onDelete={onDelete} />
          </div>
          <FieldBadges fields={group.fields} getFieldTypeIcon={getFieldTypeIcon} />
        </Card>
      ))}
    </div>
  );
};

const DesktopTable = ({
  fieldGroups,
  getFieldTypeIcon,
  onEdit,
  onDelete,
}: Omit<FieldGroupsTableProps, 'getFieldById'>) => (
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
                <FieldBadges fields={group.fields} getFieldTypeIcon={getFieldTypeIcon} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <ActionButtons group={group} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

const FieldGroupsTable = ({
  fieldGroups,
  getFieldTypeIcon,
  onEdit,
  onDelete,
}: FieldGroupsTableProps) => {
  return (
    <>
      <div className="md:hidden">
        <MobileCards
          fieldGroups={fieldGroups}
          getFieldTypeIcon={getFieldTypeIcon}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
      <div className="hidden md:block">
        <DesktopTable
          fieldGroups={fieldGroups}
          getFieldTypeIcon={getFieldTypeIcon}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </>
  );
};

export default FieldGroupsTable;
