import { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import RichEditor from '@/components/kb/RichEditor';
import { cn } from '@/lib/utils';
import { ArticleFull, Category, Tag, Mode } from './types';

interface KBArticleEditorProps {
  mode: Mode;
  activeArticle: ArticleFull | null;
  setMode: Dispatch<SetStateAction<Mode>>;
  editTitle: string;
  setEditTitle: Dispatch<SetStateAction<string>>;
  editSummary: string;
  setEditSummary: Dispatch<SetStateAction<string>>;
  editContent: string;
  setEditContent: Dispatch<SetStateAction<string>>;
  editCategoryId: number | null;
  setEditCategoryId: Dispatch<SetStateAction<number | null>>;
  editTagIds: number[];
  setEditTagIds: Dispatch<SetStateAction<number[]>>;
  editPublished: boolean;
  setEditPublished: Dispatch<SetStateAction<boolean>>;
  saving: boolean;
  categories: Category[];
  tags: Tag[];
  handleSaveArticle: () => void;
}

const KBArticleEditor = ({
  mode,
  activeArticle,
  setMode,
  editTitle,
  setEditTitle,
  editSummary,
  setEditSummary,
  editContent,
  setEditContent,
  editCategoryId,
  setEditCategoryId,
  editTagIds,
  setEditTagIds,
  editPublished,
  setEditPublished,
  saving,
  categories,
  tags,
  handleSaveArticle,
}: KBArticleEditorProps) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode(activeArticle ? 'view' : 'list')} className="gap-1">
            <Icon name="ChevronLeft" size={16} />
            Отмена
          </Button>
          <h2 className="text-lg font-semibold">{mode === 'new' ? 'Новая статья' : 'Редактирование'}</h2>
          <Button onClick={handleSaveArticle} disabled={saving} className="gap-1">
            <Icon name={saving ? 'Loader2' : 'Save'} size={14} className={saving ? 'animate-spin' : ''} />
            Сохранить
          </Button>
        </div>

        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Заголовок статьи"
          className="text-xl font-semibold"
        />
        <Textarea
          value={editSummary}
          onChange={(e) => setEditSummary(e.target.value)}
          placeholder="Краткое описание (необязательно)"
          className="min-h-[60px]"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Категория</p>
            <Select
              value={editCategoryId ? String(editCategoryId) : 'none'}
              onValueChange={(v) => setEditCategoryId(v === 'none' ? null : Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категории</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Теги</p>
            <div className="flex flex-wrap gap-1 p-2 border border-border rounded-md min-h-[40px]">
              {tags.map((t) => {
                const active = editTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setEditTagIds((prev) =>
                        active ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                      )
                    }
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border transition',
                      active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent',
                    )}
                  >
                    #{t.name}
                  </button>
                );
              })}
              {tags.length === 0 && (
                <span className="text-xs text-muted-foreground">Нет тегов</span>
              )}
            </div>
          </div>
        </div>

        <RichEditor value={editContent} onChange={(html) => setEditContent(html)} />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editPublished}
            onChange={(e) => setEditPublished(e.target.checked)}
          />
          Опубликовано (видно всем)
        </label>
      </CardContent>
    </Card>
  );
};

export default KBArticleEditor;
