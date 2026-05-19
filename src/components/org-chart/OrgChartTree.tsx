import { useDroppable } from '@dnd-kit/core';
import Icon from '@/components/ui/icon';
import { Department, DepartmentNode } from './types';
import { cn } from '@/lib/utils';

interface Props {
  nodes: DepartmentNode[];
  selectedId: number | null;
  expandedNodes: Set<number>;
  onToggleExpand: (id: number) => void;
  onSelect: (id: number) => void;
  onEdit?: (d: Department) => void;
  onAddChild?: (parentId: number) => void;
  onDelete?: (id: number) => void;
}

const Node = ({
  node,
  selectedId,
  expandedNodes,
  onToggleExpand,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
}: Props & { node: DepartmentNode }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const { setNodeRef, isOver } = useDroppable({
    id: `dept-${node.id}`,
    data: { deptId: node.id },
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
        {/* Заголовок */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-semibold text-sm leading-tight truncate flex-1" title={node.name}>
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

        {/* Руководитель */}
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
          <div className="text-xs text-muted-foreground italic mb-2">Руководитель не назначен</div>
        )}

        {/* Счётчики */}
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

      {/* Линия-связка вниз и дети */}
      {hasChildren && isExpanded && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative flex items-start gap-6 pt-0">
            {/* Горизонтальная линия */}
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
                <Node
                  node={child}
                  nodes={[]}
                  selectedId={selectedId}
                  expandedNodes={expandedNodes}
                  onToggleExpand={onToggleExpand}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const OrgChartTree = (props: Props) => {
  return (
    <div className="flex items-start justify-start gap-6 pb-4 min-w-max">
      {props.nodes.map((root) => (
        <Node key={root.id} node={root} {...props} />
      ))}
    </div>
  );
};

export default OrgChartTree;
