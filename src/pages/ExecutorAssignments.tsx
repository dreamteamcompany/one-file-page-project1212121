import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
import AddAssignmentForm from '@/components/executor-assignments/AddAssignmentForm';
import AssignmentsTable from '@/components/executor-assignments/AssignmentsTable';
import Icon from '@/components/ui/icon';
import { useAssignments, useAssignmentReference } from '@/hooks/useExecutorAssignments';

const ExecutorAssignments = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    groupAssignments,
    userAssignments,
    loading,
    addGroupAssignment,
    addUserAssignment,
    removeGroupAssignment,
    removeUserAssignment,
  } = useAssignments();

  const ref = useAssignmentReference();

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Привязка исполнителей</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Назначение групп или отдельных исполнителей на комбинации «услуга + сервис»
        </p>
      </header>

      {ref.loading ? (
        <div className="flex justify-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <AddAssignmentForm
            ticketServices={ref.ticketServices}
            groups={ref.groups}
            users={ref.users}
            filteredServices={ref.filteredServices}
            onAddGroup={addGroupAssignment}
            onAddUser={addUserAssignment}
          />

          <AssignmentsTable
            groupAssignments={groupAssignments}
            userAssignments={userAssignments}
            loading={loading}
            onRemoveGroup={removeGroupAssignment}
            onRemoveUser={removeUserAssignment}
          />
        </div>
      )}
    </PageLayout>
  );
};

export default ExecutorAssignments;
