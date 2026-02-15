import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TicketComments from '@/components/tickets/TicketComments';
import TicketHistory from '@/components/tickets/TicketHistory';
import { isoToDisplay } from '@/components/ui/date-masked-input';
import { displayFromStorage as phoneDisplay } from '@/components/ui/phone-masked-input';

interface CustomField {
  id: number;
  name: string;
  field_type: string;
  value: string;
  display_value?: string;
  hide_label?: boolean;
}

interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_id?: number;
  category_name?: string;
  category_icon?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  status_id?: number;
  status_name?: string;
  status_color?: string;
  department_id?: number;
  department_name?: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  custom_fields?: CustomField[];
}

interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  comment: string;
  is_internal: boolean;
  created_at?: string;
  attachments?: {
    id: number;
    filename: string;
    url: string;
    size: number;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    users: number[];
  }[];
}

interface AuditLog {
  id: number;
  action: string;
  username: string;
  changed_fields?: any;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  created_at: string;
}

interface TicketDetailsContentProps {
  ticket: Ticket;
  comments: Comment[];
  loadingComments: boolean;
  newComment: string;
  submittingComment: boolean;
  sendingPing: boolean;
  userId?: number;
  onCommentChange: (value: string) => void;
  onSubmitComment: (parentCommentId?: number, mentionedUserIds?: number[]) => void;
  onSendPing: () => void;
  onReaction: (commentId: number, emoji: string) => void;
  availableUsers?: Array<{id: number; name: string; email: string}>;
  onFileUpload?: (file: File) => Promise<void>;
  uploadingFile?: boolean;
  auditLogs?: AuditLog[];
  loadingHistory?: boolean;
}

const TicketDetailsContent = ({
  ticket,
  comments,
  loadingComments,
  newComment,
  submittingComment,
  sendingPing,
  userId,
  onCommentChange,
  onSubmitComment,
  onSendPing,
  onReaction,
  availableUsers,
  onFileUpload,
  uploadingFile,
  auditLogs = [],
  loadingHistory = false,
}: TicketDetailsContentProps) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'files' | 'history'>('comments');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeadlineInfo = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = currentTime;
    const due = new Date(dueDate).getTime();
    const timeLeft = due - now;
    
    if (timeLeft < 0) {
      return { color: '#ef4444', label: 'Просрочена' };
    }
    
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const daysLeft = Math.floor(timeLeft / oneDay);
    const hoursLeft = Math.floor((timeLeft % oneDay) / oneHour);
    
    if (daysLeft === 0) {
      return { color: '#ef4444', label: `Менее суток (${hoursLeft} ч)` };
    } else if (daysLeft === 1) {
      return { color: '#ef4444', label: `Остался ${daysLeft} день ${hoursLeft} ч` };
    } else if (daysLeft <= 3) {
      return { color: '#f97316', label: `Осталось ${daysLeft} дня ${hoursLeft} ч` };
    }
    return { color: '#22c55e', label: `Осталось ${daysLeft} дней ${hoursLeft} ч` };
  };

  const deadlineInfo = getDeadlineInfo(ticket.due_date);

  return (
    <div className="flex-1 lg:p-6 lg:pr-0">
      {/* Суть заявки */}
      <div className="mb-6 border rounded-lg p-4 md:p-6 lg:pl-[18px] lg:pr-2 bg-card">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4 md:mb-6">
              <span className="text-muted-foreground">#{ticket.id}</span> {ticket.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-4 md:mb-6 text-sm">
              {ticket.due_date && deadlineInfo && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Дедлайн</span>
                  <div className="flex items-center gap-2">
                    <Icon name="Clock" size={16} style={{ color: deadlineInfo.color }} />
                    <span style={{ color: deadlineInfo.color }} className="font-medium">{deadlineInfo.label}</span>
                  </div>
                </div>
              )}
              {ticket.created_at && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Дата создания</span>
                  <div className="flex items-center gap-2">
                    <Icon name="Calendar" size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
              )}
              {ticket.creator_name && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Заказчик</span>
                  <div className="flex items-center gap-2">
                    <Icon name="User" size={16} className="text-muted-foreground" />
                    <span className="font-medium text-foreground">{ticket.creator_name}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
              {ticket.status_name && (
                <Badge
                  style={{ backgroundColor: `${ticket.status_color}20`, color: ticket.status_color, borderColor: ticket.status_color }}
                  className="border font-medium"
                >
                  {ticket.status_name}
                </Badge>
              )}
              {ticket.priority_name && (
                <Badge
                  style={{ backgroundColor: `${ticket.priority_color}20`, color: ticket.priority_color, borderColor: ticket.priority_color }}
                  className="border font-medium"
                >
                  {ticket.priority_name}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-4 md:mb-6 pb-4 md:pb-6 border-b">
              <Button variant="ghost" size="sm" title="Список заявок">
                <Icon name="List" size={18} />
              </Button>
              <Button variant="ghost" size="sm" title="Редактировать заявку">
                <Icon name="Edit" size={18} />
              </Button>
              <Button variant="ghost" size="sm" title="Добавить комментарий">
                <Icon name="MessageSquare" size={18} />
              </Button>
              <Button variant="ghost" size="sm" title="Копировать заявку">
                <Icon name="Copy" size={18} />
              </Button>
              <Button variant="ghost" size="sm" title="Наблюдатели">
                <Icon name="Eye" size={18} />
              </Button>
              <Button variant="ghost" size="sm" title="Поиск по базе знаний">
                <Icon name="Search" size={18} />
              </Button>
            </div>
            
            {ticket.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Содержание</h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{ticket.description}</p>
              </div>
            )}
          </div>

          {ticket.custom_fields && ticket.custom_fields.length > 0 && (
            <div className="w-full md:w-[320px] flex-shrink-0">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Icon name="Settings" size={16} className="text-muted-foreground" />
                Дополнительные поля
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ticket.custom_fields.map((field) => {
                  const rawValue = field.display_value || field.value || '—';
                  const displayText = (field.field_type === 'checkbox' || field.field_type === 'toggle')
                    ? (rawValue === 'true' || rawValue === 'True' ? 'Да' : rawValue === 'false' || rawValue === 'False' ? 'Нет' : rawValue)
                    : field.field_type === 'date' && rawValue !== '—'
                      ? (isoToDisplay(rawValue) || rawValue)
                      : field.field_type === 'phone' && rawValue !== '—'
                        ? phoneDisplay(rawValue)
                        : rawValue;
                  const isLongValue = displayText.length > 25 || field.name.length > 20;
                  const isChain = field.field_type === 'company_structure' && displayText.includes('→');
                  return (
                    <div key={field.id} className={`p-3 rounded-lg bg-muted/30 border ${isLongValue ? 'col-span-2' : ''}`}>
                      {!field.hide_label && <p className="text-xs text-muted-foreground mb-1 truncate">{field.name}</p>}
                      {isChain ? (
                        <p className="text-sm text-foreground break-words">
                          {displayText.split('→').slice(0, -1).map((part, i) => (
                            <span key={i} className="text-muted-foreground">{part.trim()}{' → '}</span>
                          ))}
                          <span className="font-bold text-white">{displayText.split('→').pop()?.trim()}</span>
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-foreground break-words">{displayText}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Комментарии, Файлы и История (вкладки) */}
      <div className="border-b mb-6">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('comments')}
            className={`pb-2 border-b-2 text-sm font-semibold transition-all ${
              activeTab === 'comments' 
                ? 'border-primary text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Комментарии ({comments.length})
          </button>
          <button 
            onClick={() => setActiveTab('files')}
            className={`pb-2 border-b-2 text-sm transition-all ${
              activeTab === 'files' 
                ? 'border-primary text-foreground font-semibold' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Файлы (0)
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-2 border-b-2 text-sm transition-all ${
              activeTab === 'history' 
                ? 'border-primary text-foreground font-semibold' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            История ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Контент вкладок */}
      <div className="mb-6">
        {activeTab === 'comments' && (
          <TicketComments
            comments={comments}
            loadingComments={loadingComments}
            newComment={newComment}
            submittingComment={submittingComment}
            onCommentChange={onCommentChange}
            onSubmitComment={onSubmitComment}
            isCustomer={ticket.created_by === userId}
            hasAssignee={!!ticket.assigned_to}
            sendingPing={sendingPing}
            onSendPing={onSendPing}
            currentUserId={userId}
            onReaction={onReaction}
            availableUsers={availableUsers}
            onFileUpload={onFileUpload}
            uploadingFile={uploadingFile}
          />
        )}
        
        {activeTab === 'files' && (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="FileText" size={48} className="mx-auto mb-2 opacity-30" />
            <p>Файлы пока не загружены</p>
          </div>
        )}
        
        {activeTab === 'history' && (
          <TicketHistory 
            logs={auditLogs} 
            loading={loadingHistory}
          />
        )}
      </div>
    </div>
  );
};

export default TicketDetailsContent;