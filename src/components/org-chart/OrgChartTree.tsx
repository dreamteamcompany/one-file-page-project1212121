import { useDroppable } from '@dnd-kit/core';
import Icon from '@/components/ui/icon';
import { CompanyNode, Department, DepartmentNode } from './types';
import { cn } from '@/lib/utils';

interface DeptHandlers {
  selectedId: number | null;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  onSelect: (id: number) => void;
  onEdit?: (d: Department) => void;
  onAddChild?: (parentId: number) => void;
  onDelete?: (id: number) => void;
}

interface CompanyHandlers {
  expandedCompanies: Set<string>;
  onToggleCompany: (key: string) => void;
  onAddRootDept?: (companyId: number | null) => void;
  onEditCompany?: (c: { id: number; name: string }) => void;
  onDeleteCompany?: (id: number) => void;
  onCreateCompany?: () => void;
}

interface Props extends DeptHandlers, CompanyHandlers {
  companyNodes: CompanyNode[];
}

const DeptCard = ({
  node,
  ...handlers
}: DeptHandlers & { node: DepartmentNode }) => {
  const {
    selectedId,
    expandedNodes,
    onToggleExpand,
    onSelect,
    onEdit,
    onAddChild,
    onDelete,
  } = handlers;
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const { setNodeRef, isOver } = useDroppable({
    id: `dept-${node.id}`,
    data: { deptId: node.id, kind: 'dept' },
  });

  return (
    <div className="flex flex-col items-center">
      <div
        ref={setNodeRef}
        data-dept-id={node.id}
        onClick={() => onSelect(node.id)}
        className={cn(
          'group relative w-64 rounded-lg border-2 bg-card p-3 cursor-pointer transition-all',
          'hover:shadow-md',
          isSelected ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-border',
          isOver && 'border-dashed border-primary bg-primary/5',
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div
            className="font-semibold text-sm leading-tight truncate flex-1"
            title={node.name}
          >
            {node.name}
          </div>
          {(onEdit || onAddChild || onDelete) && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onAddChild && (
                <button
                  type="button"
                  className="p-1 rounded hover:bg-accent"
                  title="Добавить подотдел"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node.id);
                  }}
                >
                  <Icon name="Plus" size={13} />
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  className="p-1 rounded hover:bg-accent"
                  title="Редактировать"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(node);
                  }}
                >
                  <Icon name="Pencil" size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  title="Удалить"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                  }}
                >
                  <Icon name="Trash2" size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {node.head_name ? (
          <div className="flex items-center gap-2 mb-2">
            {node.head_photo ? (
              <img
                src={node.head_photo}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon name="User" size={14} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{node.head_name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {node.head_position || 'Руководитель'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic mb-2">
            Руководитель не назначен
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-2">
          <span className="flex items-center gap-1">
            <Icon name="Users" size={12} />
            {node.members_count}
          </span>
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="flex items-center gap-1 hover:text-foreground ml-auto"
            >
              <Icon name="Network" size={12} />
              {node.children.length} {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative flex items-start gap-6 pt-0">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '50%',
                  width: `calc(100% - 16rem)`,
                  transform: 'translateX(-50%)',
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <DeptCard node={child} {...handlers} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CompanyCard = ({
  company,
  deptHandlers,
  companyHandlers,
}: {
  company: CompanyNode;
  deptHandlers: DeptHandlers;
  companyHandlers: CompanyHandlers;
}) => {
  const {
    expandedCompanies,
    onToggleCompany,
    onAddRootDept,
    onEditCompany,
    onDeleteCompany,
  } = companyHandlers;
  const key = company.id === null ? 'none' : `c-${company.id}`;
  const isExpanded = expandedCompanies.has(key);
  const hasChildren = company.children.length > 0;
  const isVirtual = company.id === null;

  const { setNodeRef, isOver } = useDroppable({
    id: `company-${key}`,
    data: { companyId: company.id, kind: 'company' },
  });

  return (
    <div className="flex flex-col items-center">
      <div
        ref={setNodeRef}
        className={cn(
          'group relative w-72 rounded-xl border-2 bg-primary/5 p-4 transition-all',
          'hover:shadow-md',
          isOver && !isVirtual && 'border-dashed border-primary bg-primary/10',
          isVirtual ? 'border-dashed border-muted-foreground/40' : 'border-primary/40',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                isVirtual ? 'bg-muted' : 'bg-primary/15',
              )}
            >
              <Icon
                name={isVirtual ? 'CircleHelp' : 'Building2'}
                size={18}
                className={isVirtual ? 'text-muted-foreground' : 'text-primary'}
              />
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold text-sm leading-tight truncate"
                title={company.name}
              >
                {company.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Сотрудников: {company.members_count} · Отделов: {company.children.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onAddRootDept && (
              <button
                type="button"
                className="p-1 rounded hover:bg-accent"
                title="Добавить отдел"
                onClick={() => onAddRootDept(company.id)}
              >
                <Icon name="Plus" size={14} />
              </button>
            )}
            {!isVirtual && onEditCompany && (
              <button
                type="button"
                className="p-1 rounded hover:bg-accent"
                title="Переименовать компанию"
                onClick={() =>
                  onEditCompany({ id: company.id as number, name: company.name })
                }
              >
                <Icon name="Pencil" size={14} />
              </button>
            )}
            {!isVirtual && onDeleteCompany && (
              <button
                type="button"
                className="p-1 rounded hover:bg-destructive/10 text-destructive"
                title="Удалить компанию"
                onClick={() => onDeleteCompany(company.id as number)}
              >
                <Icon name="Trash2" size={14} />
              </button>
            )}
          </div>
        </div>

        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggleCompany(key)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={12} />
            {isExpanded ? 'Свернуть' : `Развернуть (${company.children.length})`}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative flex items-start gap-6 pt-0">
            {company.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '50%',
                  width: `calc(100% - 16rem)`,
                  transform: 'translateX(-50%)',
                }}
              />
            )}
            {company.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <DeptCard node={child} {...deptHandlers} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const OrgChartTree = (props: Props) => {
  const { companyNodes, onCreateCompany, ...rest } = props;
  const deptHandlers: DeptHandlers = {
    selectedId: rest.selectedId,
    expandedNodes: rest.expandedNodes,
    onToggleExpand: rest.onToggleExpand,
    onSelect: rest.onSelect,
    onEdit: rest.onEdit,
    onAddChild: rest.onAddChild,
    onDelete: rest.onDelete,
  };
  const companyHandlers: CompanyHandlers = {
    expandedCompanies: rest.expandedCompanies,
    onToggleCompany: rest.onToggleCompany,
    onAddRootDept: rest.onAddRootDept,
    onEditCompany: rest.onEditCompany,
    onDeleteCompany: rest.onDeleteCompany,
  };

  return (
    <div className="flex items-start justify-start gap-8 pb-4 min-w-max">
      {companyNodes.map((c) => (
        <CompanyCard
          key={c.id === null ? 'none' : c.id}
          company={c}
          deptHandlers={deptHandlers}
          companyHandlers={companyHandlers}
        />
      ))}
      {onCreateCompany && (
        <button
          type="button"
          onClick={onCreateCompany}
          className="w-72 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-2 transition-all"
        >
          <Icon name="Plus" size={24} />
          <span className="text-sm font-medium">Добавить компанию</span>
        </button>
      )}
    </div>
  );
};

export default OrgChartTree;
