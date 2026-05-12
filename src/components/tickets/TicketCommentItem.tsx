import Icon from '@/components/ui/icon';
import { Comment, User, getAvatarColor, getInitials, formatDate } from './TicketCommentsTypes';

interface TicketCommentItemProps {
  comment: Comment;
  parentComment: Comment | null;
  isOwn: boolean;
  showNewDivider: boolean;
  status: 'sent' | 'delivered' | 'read' | null;
  availableUsers: User[];
  canEditComments: boolean;
  canDeleteComments: boolean;
  onTogglePin?: (commentId: number) => void;
  onEditComment?: (
    commentId: number,
    data: { comment?: string; created_at?: string },
  ) => Promise<boolean>;
  onDeleteComment?: (commentId: number) => void | Promise<void | boolean>;
  onReply: (comment: Comment) => void;
  onSetEditTarget: (comment: Comment) => void;
  onSetDeleteTargetId: (id: number) => void;
  observeRef: (el: HTMLDivElement | null) => void;
}

const renderCommentText = (text: string, mentioned: number[] | undefined, availableUsers: User[]) => {
  if (!mentioned || mentioned.length === 0) return text;

  let result = text;
  mentioned.forEach(userId => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      result = result.replace(
        new RegExp(`@${user.name}`, 'g'),
        `<span class="text-primary font-semibold">@${user.name}</span>`,
      );
    }
  });

  return <span dangerouslySetInnerHTML={{ __html: result }} />;
};

const TicketCommentItem = ({
  comment,
  parentComment,
  isOwn,
  showNewDivider,
  status,
  availableUsers,
  canEditComments,
  canDeleteComments,
  onTogglePin,
  onEditComment,
  onDeleteComment,
  onReply,
  onSetEditTarget,
  onSetDeleteTargetId,
  observeRef,
}: TicketCommentItemProps) => {
  return (
    <div>
      {showNewDivider && (
        <div className="flex items-center gap-2 my-3" aria-label="Новые сообщения">
          <div className="flex-1 h-px bg-red-500" />
          <span className="text-[11px] font-semibold text-red-500 uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
            Новые сообщения
          </span>
          <div className="flex-1 h-px bg-red-500" />
        </div>
      )}
      <div
        ref={observeRef}
        data-comment-id={comment.id}
        className={`flex items-start gap-2.5 ${isOwn ? 'flex-row-reverse justify-start' : ''} ${
          comment.parent_comment_id
            ? isOwn
              ? 'mr-4 lg:mr-8'
              : 'ml-4 lg:ml-8'
            : ''
        }`}
      >
        {comment.user_photo_url ? (
          <img
            src={comment.user_photo_url}
            alt={comment.user_full_name || comment.user_name || ''}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(comment.user_id)} flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold`}>
            {getInitials(comment.user_full_name || comment.user_name)}
          </div>
        )}
        <div className="max-w-[80%] min-w-[120px]">
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <p className="font-semibold text-xs">{comment.user_full_name || comment.user_name || 'Пользователь'}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(comment.created_at)}
              {comment.edited_at && (
                <span
                  className="ml-1 italic"
                  title={`Изменено: ${formatDate(comment.edited_at)}`}
                >
                  (изменено)
                </span>
              )}
            </p>
          </div>
          <div className={`rounded-2xl px-3.5 py-2.5 ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted text-foreground rounded-tl-md'
          }`}>
            {parentComment && (
              <div className={`mb-2 pb-2 border-b ${isOwn ? 'border-primary-foreground/20' : 'border-border'}`}>
                <div className="flex items-center gap-1.5 text-xs">
                  <Icon name="CornerDownRight" size={12} className={isOwn ? 'text-primary-foreground/60' : 'text-primary'} />
                  <span className={`font-medium ${isOwn ? 'text-primary-foreground/80' : 'text-primary'}`}>{parentComment.user_name}</span>
                </div>
                <p className={`text-xs line-clamp-2 mt-0.5 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{parentComment.comment}</p>
              </div>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {renderCommentText(comment.comment, comment.mentioned_user_ids, availableUsers)}
            </p>

            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {comment.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${
                      isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background'
                    }`}
                  >
                    <Icon name="Paperclip" size={12} />
                    <span>{file.filename}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {comment.reactions && comment.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {comment.reactions.map((reaction, rIdx) => (
                <button
                  key={rIdx}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-accent transition-colors text-xs"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-muted-foreground">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Icon name="Reply" size={12} />
              Ответить
            </button>
            {onTogglePin && (
              <button
                onClick={() => onTogglePin(comment.id)}
                className={`text-xs transition-colors flex items-center gap-1 ${
                  comment.is_pinned
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                title={comment.is_pinned ? 'Открепить' : 'Закрепить'}
              >
                <Icon name="Pin" size={12} />
                {comment.is_pinned ? 'Открепить' : 'Закрепить'}
              </button>
            )}
            {canEditComments && onEditComment && (
              <button
                onClick={() => onSetEditTarget(comment)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                title="Изменить комментарий"
              >
                <Icon name="Pencil" size={12} />
                Изменить
              </button>
            )}
            {canDeleteComments && onDeleteComment && (
              <button
                onClick={() => onSetDeleteTargetId(comment.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                title="Удалить комментарий"
              >
                <Icon name="Trash2" size={12} />
                Удалить
              </button>
            )}
            {isOwn && status && (
              <span
                className="inline-flex items-center"
                title={
                  status === 'read'
                    ? 'Прочитано всеми участниками'
                    : status === 'delivered'
                    ? 'Кто-то увидел'
                    : 'Отправлено'
                }
              >
                {status === 'sent' && (
                  <Icon name="Check" size={14} className="text-muted-foreground" />
                )}
                {status === 'delivered' && (
                  <Icon name="CheckCheck" size={14} className="text-muted-foreground" />
                )}
                {status === 'read' && (
                  <Icon name="CheckCheck" size={14} className="text-sky-500" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketCommentItem;
