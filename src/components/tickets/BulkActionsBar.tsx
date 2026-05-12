import { useMemo, useState } from 'react';
import { BulkActionsBarProps, SimpleUser, userLabel } from './BulkActionsBarTypes';
import BulkActionsBarToolbar from './BulkActionsBarToolbar';
import BulkActionsBarDialogs from './BulkActionsBarDialogs';

const BulkActionsBar = ({
  selectedCount,
  statuses,
  priorities,
  users = [],
  executorGroups = [],
  isAdmin = false,
  onChangeStatus,
  onChangePriority,
  onChangeExecutor,
  onChangeExecutorGroup,
  onAddWatchers,
  onDelete,
  onCancel,
}: BulkActionsBarProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExecutorDialog, setShowExecutorDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showWatchersDialog, setShowWatchersDialog] = useState(false);
  const [executorSearch, setExecutorSearch] = useState('');
  const [watcherSearch, setWatcherSearch] = useState('');
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedWatcherIds, setSelectedWatcherIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredExecutorUsers = useMemo(() => {
    const q = executorSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: SimpleUser) => userLabel(u).toLowerCase().includes(q));
  }, [users, executorSearch]);

  const filteredWatcherUsers = useMemo(() => {
    const q = watcherSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u: SimpleUser) => userLabel(u).toLowerCase().includes(q));
  }, [users, watcherSearch]);

  const handleStatusChange = async (value: string) => {
    setLoading(true);
    try {
      await onChangeStatus(parseInt(value));
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (value: string) => {
    setLoading(true);
    try {
      await onChangePriority(parseInt(value));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyExecutor = async () => {
    if (!onChangeExecutor) return;
    setLoading(true);
    try {
      await onChangeExecutor(selectedExecutorId);
      setShowExecutorDialog(false);
      setSelectedExecutorId(null);
      setExecutorSearch('');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGroup = async () => {
    if (!onChangeExecutorGroup) return;
    setLoading(true);
    try {
      await onChangeExecutorGroup(selectedGroupId);
      setShowGroupDialog(false);
      setSelectedGroupId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyWatchers = async () => {
    if (!onAddWatchers) return;
    setLoading(true);
    try {
      await onAddWatchers(selectedWatcherIds);
      setShowWatchersDialog(false);
      setSelectedWatcherIds([]);
      setWatcherSearch('');
    } finally {
      setLoading(false);
    }
  };

  const toggleWatcher = (id: number) => {
    setSelectedWatcherIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <BulkActionsBarToolbar
        selectedCount={selectedCount}
        statuses={statuses}
        priorities={priorities}
        isAdmin={isAdmin}
        loading={loading}
        hasExecutor={!!onChangeExecutor}
        hasGroup={!!onChangeExecutorGroup}
        hasWatchers={!!onAddWatchers}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onOpenExecutorDialog={() => setShowExecutorDialog(true)}
        onOpenGroupDialog={() => setShowGroupDialog(true)}
        onOpenWatchersDialog={() => setShowWatchersDialog(true)}
        onOpenDeleteDialog={() => setShowDeleteDialog(true)}
        onCancel={onCancel}
      />

      <BulkActionsBarDialogs
        selectedCount={selectedCount}
        loading={loading}
        showDeleteDialog={showDeleteDialog}
        onCloseDeleteDialog={setShowDeleteDialog}
        onConfirmDelete={handleDelete}
        showExecutorDialog={showExecutorDialog}
        onCloseExecutorDialog={setShowExecutorDialog}
        executorSearch={executorSearch}
        onExecutorSearchChange={setExecutorSearch}
        filteredExecutorUsers={filteredExecutorUsers}
        selectedExecutorId={selectedExecutorId}
        onSelectExecutor={setSelectedExecutorId}
        onApplyExecutor={handleApplyExecutor}
        showGroupDialog={showGroupDialog}
        onCloseGroupDialog={setShowGroupDialog}
        executorGroups={executorGroups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onApplyGroup={handleApplyGroup}
        showWatchersDialog={showWatchersDialog}
        onCloseWatchersDialog={setShowWatchersDialog}
        watcherSearch={watcherSearch}
        onWatcherSearchChange={setWatcherSearch}
        filteredWatcherUsers={filteredWatcherUsers}
        selectedWatcherIds={selectedWatcherIds}
        onToggleWatcher={toggleWatcher}
        onApplyWatchers={handleApplyWatchers}
      />
    </>
  );
};

export default BulkActionsBar;
