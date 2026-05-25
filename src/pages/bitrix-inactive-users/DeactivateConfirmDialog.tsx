import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import { DeactivateMode, MODE_LABELS } from './types';

interface DeactivateConfirmDialogProps {
  confirmMode: DeactivateMode | null;
  deactivating: boolean;
  getConfirmCount: (mode: DeactivateMode) => number;
  onOpenChange: (open: boolean) => void;
  onDeactivate: () => void;
}

const DeactivateConfirmDialog = ({
  confirmMode,
  deactivating,
  getConfirmCount,
  onOpenChange,
  onDeactivate,
}: DeactivateConfirmDialogProps) => {
  return (
    <AlertDialog open={confirmMode !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Подтвердите деактивацию</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmMode && (
              <>
                Будет деактивировано <strong>{getConfirmCount(confirmMode)}</strong> пользователей
                ({MODE_LABELS[confirmMode].toLowerCase()}).
                <br /><br />
                Пользователи из списка исключений будут пропущены.
                <br /><br />
                Учётные записи будут отключены в Битрикс24. Это действие можно отменить вручную через админку Битрикса.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivating}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDeactivate}
            disabled={deactivating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deactivating ? (
              <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Деактивация...</>
            ) : (
              'Деактивировать'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeactivateConfirmDialog;
