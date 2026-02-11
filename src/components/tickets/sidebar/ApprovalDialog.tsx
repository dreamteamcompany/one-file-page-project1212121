import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  selectedApprovers: number[];
  onToggleApprover: (userId: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ApprovalDialog = ({
  open,
  onOpenChange,
  users,
  selectedApprovers,
  onToggleApprover,
  onConfirm,
  onCancel,
}: ApprovalDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выберите согласующих</DialogTitle>
          <DialogDescription>
            Данный статус требует согласования. Выберите пользователей, которые должны согласовать заявку.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedApprovers.includes(u.id)}
                  onCheckedChange={() => onToggleApprover(u.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onConfirm}
              disabled={selectedApprovers.length === 0}
              className="flex-1"
            >
              Подтвердить ({selectedApprovers.length})
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDialog;
