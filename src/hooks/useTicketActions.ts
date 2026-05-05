import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';
import { useFileUploader } from '@/hooks/useFileUploader';

export const useTicketActions = (
  ticketId: string | undefined,
  loadTicket: (showLoader?: boolean) => Promise<void>,
  loadComments: () => Promise<void>,
  loadHistory: () => Promise<void>
) => {
  const { token, hasPermission } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingPing, setSendingPing] = useState(false);
  const commentUploader = useFileUploader('uploads/attachments');

  const handleSubmitComment = async () => {
    const text = newComment.trim();
    const ready = commentUploader.successful;
    if (!text && ready.length === 0) return;
    if (commentUploader.isUploading) return;

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
          comment: text,
          is_internal: false,
          attachments: ready.map((a) => ({
            filename: a.filename,
            url: a.url,
            size: a.size,
          })),
        }),
      });

      if (response.ok) {
        setNewComment('');
        commentUploader.clear();
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
        loadTicket(false);
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

  const handleTogglePin = async (commentId: number) => {
    try {
      const url = 'https://functions.poehali.dev/5de559ba-3637-4418-aea0-26c373f191c3?action=toggle-pin';
      const resp = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
        body: JSON.stringify({ comment_id: commentId }),
      });
      if (resp.ok) {
        loadComments();
      }
    } catch (err) {
      console.error('Toggle pin failed:', err);
    }
  };

  const handleFileUpload = async (fileOrFiles: File | FileList | File[]) => {
    if (fileOrFiles instanceof File) {
      await commentUploader.upload(fileOrFiles);
    } else {
      await commentUploader.uploadMany(fileOrFiles);
    }
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
      
      if (response.ok) {
        loadTicket(false);
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
        loadTicket(false);
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
        await loadTicket(false);
        await loadHistory();
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
    uploadingFile: commentUploader.isUploading,
    pendingAttachments: commentUploader.attachments,
    removeAttachment: commentUploader.remove,
    clearAttachments: commentUploader.clear,
    handleSubmitComment,
    handleUpdateStatus,
    handleSendPing,
    handleReaction,
    handleTogglePin,
    handleFileUpload,
    handleAssignUser,
    handleAssignGroup,
    handleUpdateDueDate,
  };
};