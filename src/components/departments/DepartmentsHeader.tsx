import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface DepartmentsHeaderProps {
  canCreate: boolean;
  syncing: boolean;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onSyncFromBitrix: () => void;
  onNewDepartment: () => void;
}

const DepartmentsHeader = ({
  canCreate,
  syncing,
  dialogOpen,
  onDialogOpenChange,
  onSyncFromBitrix,
  onNewDepartment,
}: DepartmentsHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Подразделения</h1>
        <p className="text-muted-foreground mt-1">Древовидная структура подразделений компании</p>
      </div>
      {canCreate && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSyncFromBitrix} disabled={syncing}>
            <Icon name="RefreshCw" className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать из Bitrix24'}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={onNewDepartment}>
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Добавить подразделение
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default DepartmentsHeader;
