import { useRef, useEffect, useCallback, useState } from 'react';
import { EmojiClickData } from 'emoji-picker-react';
import Icon from '@/components/ui/icon';
import AttachmentUploader from '@/components/shared/AttachmentUploader';
import { UploadedAttachment } from '@/hooks/useFileUploader';
import { Comment, User } from './TicketCommentsTypes';
import { apiFetch } from '@/utils/api';
import TicketCommentsBlocked from './TicketCommentsBlocked';
import TicketCommentsReplyBanner from './TicketCommentsReplyBanner';
import TicketCommentsEditor from './TicketCommentsEditor';
import TicketCommentsToolbar from './TicketCommentsToolbar';
import {
  TEMPLATES_URL,
  IMPROVE_COMMENT_URL,
  MAX_IMG_HEIGHT,
  ReplyTemplate,
  fileToDataUrl,
  serializeEditor,
} from './TicketCommentsInput.utils';

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
  canUseTemplates?: boolean;
  canUseAI?: boolean;
  canMarkInternal?: boolean;
  isInternal?: boolean;
  onToggleInternal?: (value: boolean) => void;
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
  canUseTemplates = false,
  canUseAI = false,
  canMarkInternal = false,
  isInternal = false,
  onToggleInternal,
}: TicketCommentsInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [improvingText, setImprovingText] = useState(false);

  const loadTemplates = async (q = '') => {
    setTemplatesLoading(true);
    try {
      const url = q ? `${TEMPLATES_URL}?q=${encodeURIComponent(q)}` : TEMPLATES_URL;
      const res = await apiFetch(url);
      if (res.ok) setTemplates(await res.json());
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleOpenTemplates = () => {
    if (!showTemplates) {
      setTemplateSearch('');
      loadTemplates();
    }
    setShowTemplates((s) => !s);
  };

  const handleTemplateSelect = (tmpl: ReplyTemplate) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const text = document.createTextNode(tmpl.content);
        range.insertNode(text);
        range.setStartAfter(text);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.innerHTML = tmpl.content;
      }
    } else {
      editor.innerHTML = tmpl.content;
    }
    onCommentChange(tmpl.content);
    setShowTemplates(false);
  };

  const handleImproveText = async () => {
    const el = editorRef.current;
    if (!el) return;
    const text = serializeEditor(el).trim();
    if (!text) return;
    setImprovingText(true);
    try {
      const res = await apiFetch(IMPROVE_COMMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.improved_text) {
        el.innerText = data.improved_text;
        onCommentChange(data.improved_text);
      }
    } finally {
      setImprovingText(false);
    }
  };

  // Закрытие попапа шаблонов по клику вне
  useEffect(() => {
    if (!showTemplates) return;
    const handleClick = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplates(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTemplates]);

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

  const handleTemplateSearchChange = (value: string) => {
    setTemplateSearch(value);
    loadTemplates(value);
  };

  return (
    <div className="space-y-3 mt-6 pt-4 border-t shrink-0 w-full max-w-full overflow-x-hidden">
      {commentsBlocked && (
        <TicketCommentsBlocked commentsBlockedMessage={commentsBlockedMessage} />
      )}

      {!commentsBlocked && replyToComment && (
        <TicketCommentsReplyBanner
          replyToComment={replyToComment}
          onCancelReply={onCancelReply}
        />
      )}

      {!commentsBlocked && (
        <>
          <TicketCommentsEditor
            editorRef={editorRef}
            submittingComment={submittingComment}
            onInput={handleInput}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            showMentions={showMentions}
            mentionsRef={mentionsRef}
            filteredUsers={filteredUsers}
            searchingUsers={searchingUsers}
            mentionSearch={mentionSearch}
            onMention={onMention}
          />

          {pendingAttachments.length > 0 && onRemoveAttachment && (
            <AttachmentUploader
              attachments={pendingAttachments}
              isUploading={uploadingFile}
              onSelect={(files) => onFileUpload && onFileUpload(files)}
              onRemove={onRemoveAttachment}
              buttonLabel="Добавить ещё"
            />
          )}

          {canMarkInternal && (
            <button
              type="button"
              onClick={() => onToggleInternal?.(!isInternal)}
              className={`flex items-center gap-2 text-sm rounded-md px-2.5 py-1.5 border transition-colors ${
                isInternal
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon name={isInternal ? 'EyeOff' : 'Eye'} size={16} />
              <span>Скрытый комментарий</span>
              <span
                className={`ml-1 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isInternal ? 'bg-amber-500' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isInternal ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          )}

          <TicketCommentsToolbar
            fileInputRef={fileInputRef}
            templatesRef={templatesRef}
            emojiPickerRef={emojiPickerRef}
            hasContent={hasContent}
            submittingComment={submittingComment}
            uploadingFile={uploadingFile}
            replyToComment={replyToComment}
            onSubmit={handleSubmitWrapper}
            onFileSelect={handleFileSelect}
            onFilePickerClick={() => fileInputRef.current?.click()}
            canUseTemplates={canUseTemplates}
            showTemplates={showTemplates}
            templates={templates}
            templatesLoading={templatesLoading}
            templateSearch={templateSearch}
            onOpenTemplates={handleOpenTemplates}
            onTemplateSearchChange={handleTemplateSearchChange}
            onTemplateSelect={handleTemplateSelect}
            canUseAI={canUseAI}
            improvingText={improvingText}
            newComment={newComment}
            onImproveText={handleImproveText}
            showEmojiPicker={showEmojiPicker}
            onToggleEmojiPicker={onToggleEmojiPicker}
            onEmojiClick={handleEmojiClickLocal}
          />
        </>
      )}
    </div>
  );
};

export default TicketCommentsInput;