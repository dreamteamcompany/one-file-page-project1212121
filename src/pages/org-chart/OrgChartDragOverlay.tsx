import { DragOverlay } from '@dnd-kit/core';
import Icon from '@/components/ui/icon';
import { DepartmentUser } from '@/components/org-chart/types';

interface OrgChartDragOverlayProps {
  activeDragUser: DepartmentUser | null;
}

const OrgChartDragOverlay = ({ activeDragUser }: OrgChartDragOverlayProps) => {
  return (
    <DragOverlay>
      {activeDragUser && (
        <div className="bg-popover border rounded-md shadow-lg px-3 py-2 flex items-center gap-2">
          {activeDragUser.photo_url ? (
            <img
              src={activeDragUser.photo_url}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Icon name="User" size={14} />
            </div>
          )}
          <span className="text-sm font-medium">{activeDragUser.full_name}</span>
        </div>
      )}
    </DragOverlay>
  );
};

export default OrgChartDragOverlay;
