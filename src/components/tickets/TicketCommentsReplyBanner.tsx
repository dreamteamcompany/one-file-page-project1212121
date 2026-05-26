import Icon from '@/components/ui/icon';
import { Comment } from './TicketCommentsTypes';

interface TicketCommentsReplyBannerProps {
  replyToComment: Comment;
  onCancelReply: () => void;
}

const TicketCommentsReplyBanner = ({ replyToComment, onCancelReply }: TicketCommentsReplyBannerProps) => {
  return (
    <div className="p-3 bg-primary/5 rounded-lg border border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="CornerDownRight" size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">Ответ на комментарий</span>
            <span className="text-xs text-muted-foreground">{replyToComment.user_name}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{replyToComment.comment}</p>
        </div>
        <button onClick={onCancelReply} className="p-1 hover:bg-destructive/20 rounded transition-colors">
          <Icon name="X" size={14} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default TicketCommentsReplyBanner;
