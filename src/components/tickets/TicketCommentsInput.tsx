import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import AttachmentUploader from '@/components/shared/AttachmentUploader';
import { UploadedAttachment } from '@/hooks/useFileUploader';
import { usePasteImage } from '@/hooks/usePasteImage';
import { Comment, User } from './TicketCommentsTypes';

interface TicketCommentsInputProps {
  newComment: string;
  submittingComment: boolean;
  uploadingFile: boolean;
  pendingAttachments: UploadedAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onFileUpload?: (fileOrFiles: File | FileList | File[]) => Promise<void>;
  commentsBlocked: boolean;
  commentsBlockedMessage?: string;
  replyToComment: Comment | null;
  onCancelReply: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  emojiPickerRef: React.RefObject<HTMLDivElement>;
  showMentions: boolean;
  mentionsRef: React.RefObject<HTMLDivElement>;
  filteredUsers: User[];
  searchingUsers: boolean;
  mentionSearch: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCommentChange: (value: string) => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
  onMention: (user: User) => void;
  onSubmit: () => void;
  isCustomer: boolean;
  hasAssignee: boolean;
  sendingPing: boolean;
  onSendPing: () => void;
}

const TicketCommentsInput = ({
  newComment,
  submittingComment,
  uploadingFile,
  pendingAttachments,
  onRemoveAttachment,
  onFileUpload,
  commentsBlocked,
  commentsBlockedMessage,
  replyToComment,
  onCancelReply,
  showEmojiPicker,
  onToggleEmojiPicker,
  emojiPickerRef,
  showMentions,
  mentionsRef,
  filteredUsers,
  searchingUsers,
  mentionSearch,
  textareaRef,
  onTextChange,
  onCommentChange,
  onEmojiClick,
  onMention,
  onSubmit,
}: TicketCommentsInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { handlePaste, uploadingPaste } = usePasteImage({
    folder: 'uploads/inline-images',
    onInsert: (markdown) => {
      const ta = textareaRef.current;
      if (!ta) {
        onCommentChange(newComment + markdown);
        return;
      }
      const start = ta.selectionStart ?? newComment.length;
      const end = ta.selectionEnd ?? newComment.length;
      const next = newComment.slice(0, start) + markdown + newComment.slice(end);
      onCommentChange(next);
      requestAnimationFrame(() => {
        const pos = start + markdown.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      await onFileUpload(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3 mt-6 pt-4 border-t shrink-0">
      {commentsBlocked && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
          <Icon name="AlertTriangle" size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-400">Комментирование заблокировано</p>
            <p className="text-xs text-muted-foreground mt-1">
              {commentsBlockedMessage || 'Для продолжения работы необходимо изменить статус заявки.'}
            </p>
          </div>
        </div>
      )}
      {!commentsBlocked && replyToComment && (
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
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-destructive/20 rounded transition-colors"
            >
              <Icon name="X" size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {!commentsBlocked && (
        <>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Напишите комментарий... (используйте @ для упоминания, Ctrl+V для вставки фото)"
              value={newComment}
              onChange={onTextChange}
              onPaste={handlePaste}
              disabled={submittingComment}
              className="min-h-[90px] lg:min-h-[120px] resize-none pr-10 text-sm"
            />
            {uploadingPaste && (
              <div className="absolute inset-0 bg-background/60 rounded-md flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Загрузка изображения...
              </div>
            )}

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
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Никого не найдено
                  </div>
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

          {pendingAttachments.length > 0 && onRemoveAttachment && (
            <AttachmentUploader
              attachments={pendingAttachments}
              isUploading={uploadingFile}
              onSelect={(files) => onFileUpload && onFileUpload(files)}
              onRemove={onRemoveAttachment}
              buttonLabel="Добавить ещё"
            />
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={onSubmit}
              disabled={
                (!newComment.trim() && pendingAttachments.filter((a) => a.status === 'done').length === 0) ||
                submittingComment ||
                uploadingFile
              }
              size="sm"
              className="flex-1 min-w-[120px]"
            >
              {submittingComment ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Icon name="Send" size={16} className="mr-2" />
                  {replyToComment ? 'Ответить' : 'Отправить'}
                </>
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadingFile}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || submittingComment}
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              title="Прикрепить файл"
            >
              {uploadingFile ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Paperclip" size={16} />
              )}
            </Button>

            <div className="relative">
              <Button
                onClick={onToggleEmojiPicker}
                disabled={submittingComment}
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                title="Добавить эмодзи"
              >
                <Icon name="Smile" size={16} />
              </Button>

              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TicketCommentsInput;