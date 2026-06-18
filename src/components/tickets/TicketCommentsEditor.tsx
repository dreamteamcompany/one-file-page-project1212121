import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!showMentions) {
      setPos(null);
      return;
    }

    const updatePosition = () => {
      const el = editorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(rect.width, 384);
      const listHeight = mentionsRef.current?.offsetHeight ?? 240;
      const gap = 8;
      let top = rect.top - listHeight - gap;
      if (top < 8) {
        top = rect.bottom + gap;
      }
      setPos({ left: rect.left, top, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showMentions, filteredUsers, searchingUsers, mentionSearch, editorRef, mentionsRef]);

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

      {showMentions && pos && createPortal(
        <div
          ref={mentionsRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
          className="bg-popover border rounded-lg shadow-lg z-[9999] max-h-80 min-h-[3rem] overflow-y-auto"
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default TicketCommentsEditor;