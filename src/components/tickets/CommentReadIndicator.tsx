import Icon from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, getAvatarColor, getInitials } from './TicketCommentsTypes';
import type { Comment } from './TicketCommentsTypes';

interface Props {
  comment: Comment;
}

const CommentReadIndicator = ({ comment }: Props) => {
  const readers = comment.read_by_users || [];
  if (readers.length === 0) return null;

  const first = readers[0];
  const rest = readers.slice(1);
  const restCount = rest.length;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-12 pt-9 mt-4 -mb-6 pb-0">
      <Icon name="CheckCheck" size={13} className="text-sky-500" />
      <span>Просмотрено:</span>
      <span className="text-foreground/80 font-medium">
        {first.full_name || 'Пользователь'}
      </span>
      {restCount > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="underline decoration-dotted underline-offset-2 hover:text-foreground transition-colors"
            >
              и ещё {restCount}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <div className="text-xs text-muted-foreground px-2 py-1.5 border-b mb-1">
              Прочитали комментарий ({readers.length})
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {readers.map((r) => (
                <div
                  key={r.user_id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60"
                >
                  <Avatar className="h-7 w-7">
                    {r.photo_url ? (
                      <AvatarImage src={r.photo_url} alt={r.full_name} />
                    ) : null}
                    <AvatarFallback
                      className={`${getAvatarColor(r.user_id)} text-white text-[10px]`}
                    >
                      {getInitials(r.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.full_name}</div>
                    {r.read_at && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {formatDate(r.read_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default CommentReadIndicator;