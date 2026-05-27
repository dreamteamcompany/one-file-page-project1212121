import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Department } from '@/types';
import Icon from '@/components/ui/icon';
import { filterHiddenDepartments } from '@/utils/departmentTree';

interface DepartmentTreeProps {
  departments: Department[];
  onEdit?: (department: Department) => void;
  onDelete?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  onToggleHide?: (department: Department) => void;
  onAddChild?: (parentId: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canHide?: boolean;
  showArchived?: boolean;
}

interface TreeNodeProps {
  department: Department;
  allDepartments: Department[];
  level: number;
  onEdit?: (department: Department) => void;
  onDelete?: (id: number) => void;
  onDeactivate?: (id: number) => void;
  onToggleHide?: (department: Department) => void;
  onAddChild?: (parentId: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canHide?: boolean;
}

const TreeNode = ({
  department,
  allDepartments,
  level,
  onEdit,
  onDelete,
  onDeactivate,
  onToggleHide,
  onAddChild,
  canEdit,
  canDelete,
  canCreate,
  canHide,
}: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  const children = allDepartments.filter((d) => d.parent_id === department.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-3 px-3 hover:bg-muted/50 rounded-md group border-b border-border ${department.is_archived ? 'opacity-60' : ''} ${department.is_hidden ? 'opacity-50 italic' : ''}`}
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
            {department.is_archived && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Icon name="Archive" className="h-3 w-3" />
                В архиве
              </span>
            )}
            {department.is_hidden && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-slate-500/15 text-slate-700 dark:text-slate-300">
                <Icon name="EyeOff" className="h-3 w-3" />
                Скрыт в дереве
              </span>
            )}
            {department.bitrix_id && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-500/10 text-blue-700 dark:text-blue-400">
                Bitrix
              </span>
            )}
            {department.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{department.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity">
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
            {canHide && onToggleHide && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleHide(department)}
                title={department.is_hidden ? 'Показать в дереве' : 'Скрыть в дереве (дети останутся видимыми)'}
              >
                <Icon
                  name={department.is_hidden ? 'Eye' : 'EyeOff'}
                  className={`h-4 w-4 ${department.is_hidden ? 'text-emerald-500' : 'text-slate-500'}`}
                />
              </Button>
            )}
            {canEdit && onDeactivate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeactivate(department.id)}
                title="Деактивировать"
              >
                <Icon name="PowerOff" className="h-4 w-4 text-yellow-500" />
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
              onToggleHide={onToggleHide}
              onAddChild={onAddChild}
              canEdit={canEdit}
              canDelete={canDelete}
              canCreate={canCreate}
              canHide={canHide}
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
  onToggleHide,
  onAddChild,
  canEdit,
  canDelete,
  canCreate,
  canHide,
  showArchived = false,
}: DepartmentTreeProps) => {
  const afterArchive = showArchived
    ? departments
    : departments.filter((d) => !d.is_archived);
  // Для админов (canHide) показываем скрытые отделы как полупрозрачные,
  // чтобы их можно было вернуть в видимость. Для остальных — прячем
  // полностью, поднимая детей к ближайшему видимому предку.
  const visibleDepartments = canHide
    ? afterArchive
    : filterHiddenDepartments(afterArchive);
  const rootDepartments = visibleDepartments.filter((d) => !d.parent_id);

  if (visibleDepartments.length === 0) {
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
          allDepartments={visibleDepartments}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onDeactivate={onDeactivate}
          onToggleHide={onToggleHide}
          onAddChild={onAddChild}
          canEdit={canEdit}
          canDelete={canDelete}
          canCreate={canCreate}
          canHide={canHide}
        />
      ))}
    </div>
  );
};

export default DepartmentTree;