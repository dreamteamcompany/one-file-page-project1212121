import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Ticket, Comment, User } from './TicketDetailsModalTypes';
import { API_URL, apiFetch } from '@/utils/api';

export const useTicketDetailsLogic = (ticket: Ticket | null, onTicketUpdate?: () => void) => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [updating, setUpdating] = useState(false);
  const [sendingPing, setSendingPing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'related' | 'sla'>('info');

  useEffect(() => {
    if (ticket?.id && token) {
      loadComments();
      loadUsers();
    }
  }, [ticket?.id, token]);

  const loadUsers = async () => {
    if (!token) {
      console.log('[loadUsers] No token available');
      return;
    }

    console.log('[loadUsers] Starting to load users...');
    try {
      const response = await apiFetch(`${API_URL}?endpoint=users`, {
        headers: { 'X-Auth-Token': token },
      });

      console.log('[loadUsers] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[loadUsers] Received data:', data);
        console.log('[loadUsers] Users count:', data?.length || 0);
        
        const adaptedUsers = Array.isArray(data) ? data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.username,
          email: u.username,
          role: ''
        })) : [];
        
        setUsers(adaptedUsers);
      } else {
        const errorText = await response.text();
        console.error('[loadUsers] Error response:', errorText);
      }
    } catch (err) {
      console.error('[loadUsers] Failed to load users:', err);
    }
  };

  const loadComments = async () => {
    if (!ticket?.id || !token) return;

    setLoadingComments(true);
    try {
      // TODO: endpoint 'ticket-comments-api' не существует в api-tickets
      // const response = await apiFetch(`${API_URL}?endpoint=ticket-comments-api&ticket_id=${ticket.id}`, {
      //   headers: { 'X-Auth-Token': token },
      // });

      // if (response.ok) {
      //   const data = await response.json();
      //   setComments(data.comments || []);
      // }
      setComments([]);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (files?: File[]) => {
    if (!newComment.trim() || !ticket?.id || !token) return;

    setSubmittingComment(true);
    try {
      let fileUrls: { filename: string; url: string; size: number }[] = [];
      
      if (files && files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
          });
          
          const uploadResponse = await apiFetch(
            `${API_URL}?endpoint=upload-file`,
            {
              method: 'POST',
              headers: { 
                'X-Auth-Token': token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                filename: file.name,
                data: base64Data,
                content_type: file.type
              }),
            }
          );
          
          if (uploadResponse.ok) {
            const data = await uploadResponse.json();
            return { filename: file.name, url: data.url, size: file.size };
          }
          return null;
        });
        
        const results = await Promise.all(uploadPromises);
        fileUrls = results.filter((r): r is { filename: string; url: string; size: number } => r !== null);
      }
      
      // TODO: endpoint 'ticket-comments-api' не существует в api-tickets
      // const response = await apiFetch(`${API_URL}?endpoint=ticket-comments-api`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-Auth-Token': token,
      //   },
      //   body: JSON.stringify({
      //     ticket_id: ticket.id,
      //     comment: newComment,
      //     is_internal: false,
      //     attachments: fileUrls.length > 0 ? fileUrls : undefined,
      //   }),
      // });

      // if (response.ok) {
        setNewComment('');
        await loadComments();
        toast({
          title: 'Комментарии временно отключены',
          description: 'Функциональность в разработке',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось добавить комментарий',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить комментарий',
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (statusId: string) => {
    if (!ticket?.id || !token) return;

    setUpdating(true);
    try {
      const response = await apiFetch(`${API_URL}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({
          id: ticket.id,
          status_id: parseInt(statusId),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Статус тикета обновлен',
        });
        if (onTicketUpdate) {
          onTicketUpdate();
        }
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось обновить статус',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendPing = async () => {
    if (!ticket?.id || !token) return;

    setSendingPing(true);
    try {
      // TODO: endpoint 'ticket-comments-api' не существует в api-tickets
      // await apiFetch(`${API_URL}?endpoint=ticket-comments-api`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'X-Auth-Token': token,
      //   },
      //   body: JSON.stringify({ ticket_id: ticket.id, is_ping: true }),
      // });
      loadComments();
      toast({
        title: 'Функция временно отключена',
        description: 'Пинги будут доступны позже',
        variant: 'destructive',
      });
    } catch (err) {
      console.error('Failed to send ping:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить запрос',
        variant: 'destructive',
      });
    } finally {
      setSendingPing(false);
    }
  };

  const handleReaction = async (commentId: number, emoji: string) => {
    if (!token) return;

    try {
      await apiFetch(`${API_URL}?endpoint=comment-reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ comment_id: commentId, emoji }),
      });
      loadComments();
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!ticket?.id || !token) return;

    setUpdating(true);
    try {
      const mainUrl = 'https://functions.poehali.dev/8f2170d4-9167-4354-85a1-4478c2403dfd';
      const assignedUserId = userId === 'unassign' ? null : Number(userId);
      
      const response = await fetch(`${mainUrl}?endpoint=tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ 
          id: ticket.id, 
          assigned_to: assignedUserId 
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Исполнитель назначен',
        });
        if (onTicketUpdate) {
          onTicketUpdate();
        }
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось назначить исполнителя',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to assign user:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось назначить исполнителя',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return {
    comments,
    newComment,
    setNewComment,
    loadingComments,
    submittingComment,
    users,
    updating,
    sendingPing,
    activeTab,
    setActiveTab,
    user,
    handleSubmitComment,
    handleUpdateStatus,
    handleSendPing,
    handleReaction,
    handleAssignUser,
  };
};