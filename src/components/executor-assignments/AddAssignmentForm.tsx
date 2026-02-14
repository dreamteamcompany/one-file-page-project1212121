import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import type {
  RefTicketService,
  RefService,
  RefUser,
  RefGroup,
} from '@/hooks/useExecutorAssignments';

type AssigneeType = 'group' | 'user';

interface AddAssignmentFormProps {
  ticketServices: RefTicketService[];
  groups: RefGroup[];
  users: RefUser[];
  filteredServices: (ticketServiceId: number) => RefService[];
  onAddGroup: (groupId: number, tsId: number, sId: number) => Promise<boolean>;
  onAddUser: (userId: number, tsId: number, sId: number) => Promise<boolean>;
}

const AddAssignmentForm = ({
  ticketServices,
  groups,
  users,
  filteredServices,
  onAddGroup,
  onAddUser,
}: AddAssignmentFormProps) => {
  const [assigneeType, setAssigneeType] = useState<AssigneeType>('group');
  const [selectedTs, setSelectedTs] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [saving, setSaving] = useState(false);

  const serviceOptions = useMemo(
    () => (selectedTs ? filteredServices(Number(selectedTs)) : []),
    [selectedTs, filteredServices],
  );

  const handleTsChange = (val: string) => {
    setSelectedTs(val);
    setSelectedService('');
  };

  const handleTypeChange = (val: string) => {
    setAssigneeType(val as AssigneeType);
    setSelectedAssignee('');
  };

  const canSubmit = selectedTs && selectedService && selectedAssignee && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const tsId = Number(selectedTs);
    const sId = Number(selectedService);
    const assigneeId = Number(selectedAssignee);

    const success = assigneeType === 'group'
      ? await onAddGroup(assigneeId, tsId, sId)
      : await onAddUser(assigneeId, tsId, sId);

    setSaving(false);
    if (success) {
      setSelectedTs('');
      setSelectedService('');
      setSelectedAssignee('');
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon name="Plus" size={16} />
        Добавить привязку
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Select value={selectedTs} onValueChange={handleTsChange}>
          <SelectTrigger>
            <SelectValue placeholder="Услуга" />
          </SelectTrigger>
          <SelectContent>
            {ticketServices.map(ts => (
              <SelectItem key={ts.id} value={String(ts.id)}>{ts.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedService}
          onValueChange={setSelectedService}
          disabled={!selectedTs}
        >
          <SelectTrigger>
            <SelectValue placeholder="Сервис" />
          </SelectTrigger>
          <SelectContent>
            {serviceOptions.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="group">Группа</SelectItem>
            <SelectItem value="user">Исполнитель</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
          <SelectTrigger>
            <SelectValue placeholder={assigneeType === 'group' ? 'Выберите группу' : 'Выберите исполнителя'} />
          </SelectTrigger>
          <SelectContent>
            {assigneeType === 'group'
              ? groups.map(g => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))
              : users.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))
            }
          </SelectContent>
        </Select>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1">
          {saving
            ? <Icon name="Loader2" size={16} className="animate-spin" />
            : <Icon name="Link" size={16} />
          }
          Привязать
        </Button>
      </div>
    </div>
  );
};

export default AddAssignmentForm;
