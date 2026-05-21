import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import AttachmentUploader from '@/components/shared/AttachmentUploader';
import { UploadedAttachment } from '@/hooks/useFileUploader';
import { Comment, User } from './TicketCommentsTypes';

const MAX_IMG_HEIGHT = 320;

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
  /** Итоговый HTML для отправки — собирается внутри редактора */
  onEditorChange?: (html: string, text: string) => void;
}

/** Конвертирует File в data URL */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

/** Сериализует contenteditable → plain-text + markdown изображений */
function serializeEditor(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'BR') {
      result += '\n';
    } else if (node.nodeName === 'IMG') {
      const src = (node as HTMLImageElement).src;
      result += `\n![](${src})\n`;
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      result += '\n' + serializeEditor(node as HTMLElement);
    } else {
      result += serializeEditor(node as HTMLElement);
    }
  });
  return result;
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
  onCommentChange,
  onEmojiClick,
  onMention,
  onSubmit,
}: TicketCommentsInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const isEmpty = (el: HTMLElement) => {
    const text = el.innerText.trim();
    const hasImg = el.querySelector('img') !== null;
    return text === '' && !hasImg;
  };

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = serializeEditor(el).trim();
    onCommentChange(text);
  }, [onCommentChange]);

  const insertImageAtCursor = useCallback(async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = `${MAX_IMG_HEIGHT}px`;
    img.style.borderRadius = '6px';
    img.style.display = 'block';
    img.style.margin = '4px 0';
    img.style.cursor = 'pointer';
    img.onclick = () => window.open(dataUrl, '_blank');

    const sel = window.getSelection();
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // убеждаемся что курсор внутри редактора
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(img);
        // ставим курсор после картинки
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(img);
      }
    } else {
      editor.appendChild(img);
    }

    handleInput();
  }, [handleInput]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    await insertImageAtCursor(file);
  }, [insertImageAtCursor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmitWrapper();
    }
    // @ для упоминаний — просто пробрасываем через onCommentChange
    if (e.key === '@') {
      setTimeout(() => {
        const el = editorRef.current;
        if (el) onCommentChange(serializeEditor(el));
      }, 0);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      await onFileUpload(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitWrapper = () => {
    const el = editorRef.current;
    if (el) {
      const text = serializeEditor(el).trim();
      onCommentChange(text);
    }
    onSubmit();
    // очищаем редактор после отправки
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        onCommentChange('');
      }
    }, 100);
  };

  // Вставка эмодзи в позицию курсора
  const handleEmojiClickLocal = (emojiData: EmojiClickData) => {
    const editor = editorRef.current;
    if (!editor) { onEmojiClick(emojiData); return; }
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(emojiData.emoji);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
        return;
      }
    }
    onEmojiClick(emojiData);
  };

  // Синхронизируем очистку поля снаружи (после отправки)
  useEffect(() => {
    if (newComment === '' && editorRef.current) {
      if (editorRef.current.innerHTML !== '') {
        editorRef.current.innerHTML = '';
      }
    }
  }, [newComment]);

  const hasContent = newComment.trim().length > 0 ||
    pendingAttachments.filter((a) => a.status === 'done').length > 0;

  return (
    <div className="space-y-3 mt-6 pt-4 border-t shrink-0 w-full max-w-full overflow-x-hidden">
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
            <button onClick={onCancelReply} className="p-1 hover:bg-destructive/20 rounded transition-colors">
              <Icon name="X" size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {!commentsBlocked && (
        <>
          <div className="relative">
            {/* contenteditable редактор */}
            <div
              ref={editorRef}
              contentEditable={!submittingComment}
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
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
              onClick={handleSubmitWrapper}
              disabled={!hasContent || submittingComment || uploadingFile}
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
                  <EmojiPicker onEmojiClick={handleEmojiClickLocal} />
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