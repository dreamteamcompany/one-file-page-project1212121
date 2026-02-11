import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_URL } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export interface TicketStatus {
  id: number;
  name: string;
  color: string;
  is_closed: boolean;
  is_open: boolean;
  is_approval: boolean;
  is_approval_revoked: boolean;
  is_approved: boolean;
  is_waiting_response: boolean;
}

export const useTicketStatuses = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('ticket_statuses', 'read')) {
      navigate('/tickets');
      return;
    }
    loadStatuses();
  }, [hasPermission, navigate]);

  const loadStatuses = () => {
    apiFetch(`${API_URL}?endpoint=ticket-statuses`)
      .then(res => res.json())
      .then((data) => {
        setStatuses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load ticket statuses:', err);
        setStatuses([]);
        setLoading(false);
      });
  };

  const saveStatus = async (
    formData: {
      name: string;
      color: string;
      is_closed: boolean;
      is_open: boolean;
      is_approval: boolean;
      is_approval_revoked: boolean;
      is_approved: boolean;
      is_waiting_response: boolean;
    },
    editingStatus: TicketStatus | null
  ) => {
    const requiredPermission = editingStatus ? 'update' : 'create';
    if (!hasPermission('ticket_statuses', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return false;
    }
    
    try {
      const url = `${API_URL}?endpoint=ticket-statuses`;
      const method = editingStatus ? 'PUT' : 'POST';
      const body = editingStatus 
        ? { id: editingStatus.id, ...formData }
        : formData;

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        loadStatuses();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save status:', err);
      return false;
    }
  };

  const deleteStatus = async (id: number) => {
    if (!hasPermission('ticket_statuses', 'remove')) {
      alert('У вас нет прав для удаления статусов');
      return false;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этот статус?')) return false;

    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=ticket-statuses`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id })
        }
      );

      if (response.ok) {
        loadStatuses();
        return true;
      } else {
        const data = await response.json();
        alert(data.error || 'Не удалось удалить статус');
        return false;
      }
    } catch (err) {
      console.error('Failed to delete status:', err);
      return false;
    }
  };

  return {
    statuses,
    loading,
    saveStatus,
    deleteStatus,
    hasPermission,
  };
};
