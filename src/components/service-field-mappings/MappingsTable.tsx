import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServiceFieldMapping } from './types';

interface MappingsTableProps {
  mappings: ServiceFieldMapping[];
  onEdit: (mapping: ServiceFieldMapping) => void;
  onDelete: (id: number) => void;
  getCategoryName: (id: number) => string;
  getServiceName: (id: number) => string;
  getFieldGroupNames: (ids: number[]) => string[];
  canUpdate?: boolean;
  canDelete?: boolean;
}

const FieldGroupBadges = ({
  mapping,
  getFieldGroupNames,
}: {
  mapping: ServiceFieldMapping;
  getFieldGroupNames: (ids: number[]) => string[];
}) => {
  if (mapping.field_group_name) {
    return (
      <Badge variant="secondary" className="text-xs">
        {mapping.field_group_name}
      </Badge>
    );
  }

  if (!mapping.field_group_ids || mapping.field_group_ids.length === 0) {
    return <span className="text-xs text-muted-foreground">Нет групп</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {getFieldGroupNames(mapping.field_group_ids).map((name, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">
          {name}
        </Badge>
      ))}
    </div>
  );
};

const ActionButtons = ({
  mapping,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
}: {
  mapping: ServiceFieldMapping;
  onEdit: (mapping: ServiceFieldMapping) => void;
  onDelete: (id: number) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) => (
  <div className="flex gap-2">
    {canUpdate && (
      <Button variant="ghost" size="sm" onClick={() => onEdit(mapping)}>
        <Icon name="Pencil" size={16} />
      </Button>
    )}
    {canDelete && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(mapping.id)}
        className="text-destructive hover:text-destructive"
      >
        <Icon name="Trash2" size={16} />
      </Button>
    )}
  </div>
);

const EmptyState = () => (
  <div className="text-center py-12 text-muted-foreground">
    <Icon name="Link" size={48} className="mx-auto mb-4 opacity-50" />
    <p className="text-lg mb-2">Нет связей</p>
    <p className="text-sm">Создайте первую связь между услугой, сервисом и полями</p>
  </div>
);

const MobileCards = ({
  mappings,
  onEdit,
  onDelete,
  getCategoryName,
  getServiceName,
  getFieldGroupNames,
  canUpdate = true,
  canDelete = true,
}: MappingsTableProps) => {
  if (mappings.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {mappings.map((mapping) => (
        <Card key={mapping.id} className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {mapping.ticket_service_name || getCategoryName(mapping.service_category_id || mapping.ticket_service_id || 0)}
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                {mapping.service_name || getServiceName(mapping.service_id)}
              </Badge>
            </div>
            <ActionButtons
              mapping={mapping}
              onEdit={onEdit}
              onDelete={onDelete}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Группы полей</p>
            <FieldGroupBadges mapping={mapping} getFieldGroupNames={getFieldGroupNames} />
          </div>
        </Card>
      ))}
    </div>
  );
};

const DesktopTable = ({
  mappings,
  onEdit,
  onDelete,
  getCategoryName,
  getServiceName,
  getFieldGroupNames,
  canUpdate = true,
  canDelete = true,
}: MappingsTableProps) => {
  if (mappings.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Услуга</TableHead>
            <TableHead>Сервис</TableHead>
            <TableHead>Группы полей</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow key={mapping.id}>
              <TableCell className="font-medium">
                {mapping.ticket_service_name || getCategoryName(mapping.service_category_id || mapping.ticket_service_id || 0)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {mapping.service_name || getServiceName(mapping.service_id)}
                </Badge>
              </TableCell>
              <TableCell>
                <FieldGroupBadges mapping={mapping} getFieldGroupNames={getFieldGroupNames} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <ActionButtons
                    mapping={mapping}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const MappingsTable = (props: MappingsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Icon name="Link" size={20} />
          Список связей
          <Badge variant="secondary" className="ml-auto">
            {props.mappings.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="md:hidden">
          <MobileCards {...props} />
        </div>
        <div className="hidden md:block">
          <DesktopTable {...props} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MappingsTable;
