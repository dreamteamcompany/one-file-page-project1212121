import Icon from '@/components/ui/icon';
import { User } from './TicketCommentsTypes';

interface TicketCommentsEditorProps {
  editorRef: React.RefObject<HTMLDivElement>;
  submittingComment: boolean;
  onInput: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  showMentions: boolean;
  mentionsRef: React.RefObject<HTMLDivElement>;
  filteredUsers: User[];
  searchingUsers: boolean;
  mentionSearch: string;
  onMention: (user: User) => void;
}

const TicketCommentsEditor = ({
  editorRef,
  submittingComment,
  onInput,
  onPaste,
  onKeyDown,
  showMentions,
  mentionsRef,
  filteredUsers,
  searchingUsers,
  mentionSearch,
  onMention,
}: TicketCommentsEditorProps) => {
  return (
    <div className="relative">
      {/* contenteditable редактор */}
      <div
        ref={editorRef}
        contentEditable={!submittingComment}
        suppressContentEditableWarning
        onInput={onInput}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        data-placeholder="Напишите комментарий... (используйте @ для упоминания, Ctrl+V для вставки фото)"
        className={[
          'min-h-[90px] lg:min-h-[120px] w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          'overflow-y-auto overflow-x-hidden max-h-[400px]',
          submittingComment ? 'opacity-50 pointer-events-none' : '',
          'empty-editor',
        ].join(' ')}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', touchAction: 'pan-y' }}
      />

      {showMentions && (
        <div
          ref={mentionsRef}
          className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {searchingUsers && filteredUsers.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Icon name="Loader2" size={14} className="animate-spin" />
              Поиск пользователей...
            </div>
          )}
          {!searchingUsers && filteredUsers.length === 0 && mentionSearch && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Никого не найдено</div>
          )}
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onMention(user)}
              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Icon name="User" size={14} className="text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketCommentsEditor;
