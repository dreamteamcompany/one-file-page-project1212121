import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';

export const useTicketActions = (
  ticketId: string | undefined,
  loadTicket: () => Promise<void>,
  loadComments: () => Promise<void>,
  loadHistory: () => Promise<void>
) => {
  const { token, hasPermission } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingPing, setSendingPing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleSubmitComment = async (parentCommentId?: number, mentionedUserIds?: number[]) => {
    if (!newComment.trim()) return;
    
    try {
      setSubmittingComment(true);
      const commentsUrl = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3';
      const response = await apiFetch(commentsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ 
          ticket_id: ticketId, 
          comment: newComment, 
          is_internal: false
        }),
      });
      
      if (response.ok) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (statusId: number) => {
    if (!hasPermission('tickets', 'update')) {
      console.error('Нет прав для изменения статуса заявки');
      return;
    }
    
    try {
      setUpdating(true);
      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ id: ticketId, status_id: statusId }),
      });
      
      if (response.ok) {
        loadTicket();
        loadHistory();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendPing = async () => {
    try {
      setSendingPing(true);
      const commentsUrl = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3';
      await apiFetch(commentsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ 
          ticket_id: ticketId, 
          comment: '🔔 Запрос статуса заявки',
          is_internal: false
        }),
      });
      loadComments();
    } catch (error) {
      console.error('Error sending ping:', error);
    } finally {
      setSendingPing(false);
    }
  };

  const handleReaction = async (commentId: number, emoji: string) => {
    console.log('Reactions feature not yet implemented');
  };

  const handleFileUpload = async (file: File) => {
    console.log('File upload feature not yet implemented');
    setUploadingFile(false);
  };

  const handleAssignUser = async (userId: string) => {
    console.log('Assign user:', userId);
    try {
      setUpdating(true);
      const assignedUserId = userId === 'unassign' ? null : Number(userId);
      
      console.log('Sending assign request:', { id: ticketId, assigned_to: assignedUserId });
      
      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ id: ticketId, assigned_to: assignedUserId }),
      });
      
      console.log('Assign response:', response.status, await response.text());
      
      if (response.ok) {
        loadTicket();
        loadHistory();
      }
    } catch (error) {
      console.error('Error assigning user:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignGroup = async (groupId: string) => {
    try {
      setUpdating(true);
      const executorGroupId = groupId === 'unassign' ? null : Number(groupId);

      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ id: ticketId, executor_group_id: executorGroupId }),
      });

      if (response.ok) {
        loadTicket();
        loadHistory();
      }
    } catch (error) {
      console.error('Error assigning group:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDueDate = async (dueDate: string | null) => {
    try {
      setUpdating(true);
      console.log('[UpdateDueDate] Отправка:', { id: ticketId, due_date: dueDate });
      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ id: ticketId, due_date: dueDate }),
      });
      
      console.log('[UpdateDueDate] Ответ:', response.status, await response.text());
      
      if (response.ok) {
        await loadTicket();
        await loadHistory();
        console.log('[UpdateDueDate] Данные обновлены');
      }
    } catch (error) {
      console.error('[UpdateDueDate] Ошибка:', error);
    } finally {
      setUpdating(false);
    }
  };

  return {
    newComment,
    setNewComment,
    submittingComment,
    updating,
    sendingPing,
    uploadingFile,
    handleSubmitComment,
    handleUpdateStatus,
    handleSendPing,
    handleReaction,
    handleFileUpload,
    handleAssignUser,
    handleAssignGroup,
    handleUpdateDueDate,
  };
};