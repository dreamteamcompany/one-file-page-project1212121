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
import { ExceptionItem } from './types';

interface RemoveExceptionDialogProps {
  removeTarget: ExceptionItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirmRemove: () => void;
}

const RemoveExceptionDialog = ({
  removeTarget,
  onOpenChange,
  onConfirmRemove,
}: RemoveExceptionDialogProps) => {
  return (
    <AlertDialog open={removeTarget !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Убрать из исключений?</AlertDialogTitle>
          <AlertDialogDescription>
            {removeTarget && (
              <>Пользователь <strong>{removeTarget.full_name}</strong> снова сможет попасть под автоблокировку.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmRemove}>Убрать</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveExceptionDialog;
