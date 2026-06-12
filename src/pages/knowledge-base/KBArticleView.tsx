import { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { ArticleFull, Comment, Mode } from './types';
import { formatDateOnlyMSK, formatDateTimeMSK } from '@/utils/dateFormat';

interface KBArticleViewProps {
  activeArticle: ArticleFull;
  comments: Comment[];
  newComment: string;
  setNewComment: Dispatch<SetStateAction<string>>;
  canWrite: boolean;
  setMode: Dispatch<SetStateAction<Mode>>;
  toggleFavorite: () => void;
  toggleLike: () => void;
  startEditArticle: () => void;
  handleDeleteArticle: () => void;
  handleAddComment: () => void;
  handleUploadFile: (file: File) => void;
  handleDeleteFile: (fid: number) => void;
}

const KBArticleView = ({
  activeArticle,
  comments,
  newComment,
  setNewComment,
  canWrite,
  setMode,
  toggleFavorite,
  toggleLike,
  startEditArticle,
  handleDeleteArticle,
  handleAddComment,
  handleUploadFile,
  handleDeleteFile,
}: KBArticleViewProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode('list')} className="gap-1">
            <Icon name="ChevronLeft" size={16} />
            Назад
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeArticle.is_favorite ? 'default' : 'outline'}
              onClick={toggleFavorite}
              className="gap-1"
            >
              <Icon name="Star" size={14} className={activeArticle.is_favorite ? 'fill-current' : ''} />
              {activeArticle.is_favorite ? 'В избранном' : 'В избранное'}
            </Button>
            <Button
              size="sm"
              variant={activeArticle.is_liked ? 'default' : 'outline'}
              onClick={toggleLike}
              className="gap-1"
            >
              <Icon name="Heart" size={14} className={activeArticle.is_liked ? 'fill-current' : ''} />
              {activeArticle.likes_count}
            </Button>
            {canWrite && (
              <>
                <Button size="sm" variant="outline" onClick={startEditArticle} className="gap-1">
                  <Icon name="Pencil" size={14} />
                  Изменить
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteArticle} className="gap-1">
                  <Icon name="Trash2" size={14} />
                  Удалить
                </Button>
              </>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">{activeArticle.title}</h1>
        {activeArticle.summary && (
          <p className="text-base text-muted-foreground mb-4">{activeArticle.summary}</p>
        )}
        <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
          {activeArticle.category_name && (
            <span
              className="px-2 py-0.5 rounded"
              style={activeArticle.category_color ? { backgroundColor: `${activeArticle.category_color}20`, color: activeArticle.category_color } : undefined}
            >
              {activeArticle.category_name}
            </span>
          )}
          {activeArticle.author_name && (
            <span className="flex items-center gap-1">
              <Icon name="User" size={12} />
              {activeArticle.author_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon name="Clock" size={12} />
            {formatDateOnlyMSK(activeArticle.updated_at)}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="Eye" size={12} />
            {activeArticle.views_count}
          </span>
          {activeArticle.tags.map((t) => (
            <span
              key={t.id}
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={t.color ? { borderColor: t.color, color: t.color } : undefined}
            >
              #{t.name}
            </span>
          ))}
        </div>

        <div
          className="prose prose-sm max-w-none kb-content"
          dangerouslySetInnerHTML={{ __html: activeArticle.content_html || '' }}
        />

        {/* Files */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Icon name="Paperclip" size={16} />
              Прикреплённые файлы ({activeArticle.files.length})
            </h3>
            {canWrite && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadFile(f);
                    e.currentTarget.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-accent">
                  <Icon name="Upload" size={12} />
                  Загрузить
                </span>
              </label>
            )}
          </div>
          {activeArticle.files.length === 0 ? (
            <p className="text-xs text-muted-foreground">Файлов нет</p>
          ) : (
            <ul className="space-y-1">
              {activeArticle.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Icon name="File" size={14} />
                    <span>{f.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(f.size / 1024).toFixed(1)} КБ)
                    </span>
                  </a>
                  {canWrite && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteFile(f.id)}>
                      <Icon name="X" size={12} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Linked tickets */}
        {activeArticle.linked_tickets.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Icon name="Ticket" size={16} />
              Связанные заявки ({activeArticle.linked_tickets.length})
            </h3>
            <ul className="space-y-1">
              {activeArticle.linked_tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="w-full text-left p-2 rounded-md hover:bg-accent flex items-center gap-2 text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground">#{t.id}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.status_name && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={t.status_color ? { backgroundColor: `${t.status_color}20`, color: t.status_color } : undefined}
                      >
                        {t.status_name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments */}
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Icon name="MessageSquare" size={16} />
            Комментарии ({comments.length})
          </h3>
          <div className="space-y-3 mb-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                  {(c.user_name || '?').charAt(0)}
                </div>
                <div className="flex-1 bg-muted/40 rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{c.user_name}</span>
                    <span className="text-muted-foreground">{formatDateTimeMSK(c.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Написать комментарий..."
              className="min-h-[60px]"
            />
            <Button onClick={handleAddComment} disabled={!newComment.trim()} className="self-end gap-1">
              <Icon name="Send" size={14} />
              Отправить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KBArticleView;