import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Comment } from './TicketCommentsTypes';
import { ReplyTemplate } from './TicketCommentsInput.utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface TicketCommentsToolbarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  templatesRef: React.RefObject<HTMLDivElement>;
  emojiPickerRef: React.RefObject<HTMLDivElement>;

  hasContent: boolean;
  submittingComment: boolean;
  uploadingFile: boolean;
  replyToComment: Comment | null;
  onSubmit: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilePickerClick: () => void;

  canUseTemplates: boolean;
  showTemplates: boolean;
  templates: ReplyTemplate[];
  templatesLoading: boolean;
  templateSearch: string;
  onOpenTemplates: () => void;
  onTemplateSearchChange: (value: string) => void;
  onTemplateSelect: (tmpl: ReplyTemplate) => void;

  canUseAI: boolean;
  improvingText: boolean;
  newComment: string;
  onImproveText: () => void;

  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onEmojiClick: (emojiData: EmojiClickData) => void;
}

const TicketCommentsToolbar = ({
  fileInputRef,
  templatesRef,
  emojiPickerRef,
  hasContent,
  submittingComment,
  uploadingFile,
  replyToComment,
  onSubmit,
  onFileSelect,
  onFilePickerClick,
  canUseTemplates,
  showTemplates,
  templates,
  templatesLoading,
  templateSearch,
  onOpenTemplates,
  onTemplateSearchChange,
  onTemplateSelect,
  canUseAI,
  improvingText,
  newComment,
  onImproveText,
  showEmojiPicker,
  onToggleEmojiPicker,
  onEmojiClick,
}: TicketCommentsToolbarProps) => {
  const isMobile = useIsMobile();

  const templatesList = (
    <>
      <div className="p-2 border-b border-border">
        <Input
          value={templateSearch}
          onChange={(e) => onTemplateSearchChange(e.target.value)}
          placeholder="Поиск шаблона..."
          className="h-9 text-sm sm:h-7 sm:text-xs"
          autoFocus={!isMobile}
        />
      </div>
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {templatesLoading ? (
          <div className="flex justify-center py-4">
            <Icon name="Loader2" size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            {templateSearch ? 'Ничего не найдено' : 'Шаблонов пока нет'}
          </div>
        ) : (
          templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplateSelect(t)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-b-0"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-medium truncate">{t.title}</p>
                {t.is_shared && (
                  <Icon name="Globe" size={10} className="text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{t.content}</p>
            </button>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        onClick={onSubmit}
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
        onChange={onFileSelect}
        className="hidden"
        disabled={uploadingFile}
      />

      {canUseTemplates && (
        <div className="relative" ref={templatesRef}>
          <Button
            onClick={onOpenTemplates}
            disabled={submittingComment}
            variant={showTemplates ? 'secondary' : 'ghost'}
            size="sm"
            className="flex-shrink-0"
            title="Шаблоны ответов"
          >
            <Icon name="LayoutTemplate" size={16} />
          </Button>
          {showTemplates && !isMobile && (
            <div className="absolute bottom-full right-0 mb-2 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
              {templatesList}
            </div>
          )}

          {showTemplates && isMobile && (
            <div className="fixed inset-0 z-[60]">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={onOpenTemplates}
              />
              <div className="absolute inset-x-0 bottom-0 bg-popover border-t border-border rounded-t-2xl shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Шаблоны ответов</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={onOpenTemplates}
                    aria-label="Закрыть"
                  >
                    <Icon name="X" size={18} />
                  </Button>
                </div>
                {templatesList}
              </div>
            </div>
          )}
        </div>
      )}

      {canUseAI && (
        <Button
          onClick={onImproveText}
          disabled={!newComment.trim() || improvingText || submittingComment}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
          title="Улучшить текст с помощью AI"
        >
          {improvingText ? (
            <Icon name="Loader2" size={16} className="animate-spin" />
          ) : (
            <Icon name="Sparkles" size={16} />
          )}
        </Button>
      )}

      <Button
        onClick={onFilePickerClick}
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
  );
};

export default TicketCommentsToolbar;