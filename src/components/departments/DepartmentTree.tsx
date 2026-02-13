import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Department } from '@/types';
import Icon from '@/components/ui/icon';

interface DepartmentTreeProps {
  departments: Department[];
  onEdit?: (department: Department) => void;
  onDelete?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  onAddChild?: (parentId: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
}

interface TreeNodeProps {
  department: Department;
  allDepartments: Department[];
  level: number;
  onEdit?: (department: Department) => void;
  onDelete?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  onAddChild?: (parentId: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
}

const TreeNode = ({
  department,
  allDepartments,
  level,
  onEdit,
  onDelete,
  onDeactivate,
  onAddChild,
  canEdit,
  canDelete,
  canCreate,
}: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const children = allDepartments.filter((d) => d.parent_id === department.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-3 px-3 hover:bg-muted/50 rounded-md group border-b border-white/5"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center w-5 h-5"
        >
          {hasChildren ? (
            expanded ? (
              <Icon name="ChevronDown" className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Icon name="ChevronRight" className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>

        <Icon name="Building2" className="h-4 w-4 text-primary" />

        <div className="flex-1 flex items-center justify-between">
          <div>
            <span className="font-medium">{department.name}</span>
            {department.code && (
              <span className="ml-2 text-xs text-muted-foreground">({department.code})</span>
            )}
            {department.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{department.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canCreate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddChild?.(department.id)}
                title="Добавить подразделение"
              >
                <Icon name="Plus" className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(department)}
                title="Редактировать"
              >
                <Icon name="Edit" className="h-4 w-4" />
              </Button>
            )}
            {canEdit && onDeactivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeactivate(department.id)}
                title="Деактивировать"
              >
                <Icon name="EyeOff" className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(department.id)}
                title="Удалить"
              >
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              department={child}
              allDepartments={allDepartments}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onDeactivate={onDeactivate}
              onAddChild={onAddChild}
              canEdit={canEdit}
              canDelete={canDelete}
              canCreate={canCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentTree = ({
  departments,
  onEdit,
  onDelete,
  onDeactivate,
  onAddChild,
  canEdit,
  canDelete,
  canCreate,
}: DepartmentTreeProps) => {
  const rootDepartments = departments.filter((d) => !d.parent_id);

  if (departments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon name="Building2" className="mx-auto h-12 w-12 mb-2 opacity-20" />
        <p>Подразделения не найдены</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rootDepartments.map((department) => (
        <TreeNode
          key={department.id}
          department={department}
          allDepartments={departments}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeactivate={onDeactivate}
          onAddChild={onAddChild}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
        />
      ))}
    </div>
  );
};

export default DepartmentTree;