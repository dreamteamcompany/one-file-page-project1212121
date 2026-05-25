import { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Category, Tag, Mode } from './types';

interface KBSidebarProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  filterCategory: number | null;
  setFilterCategory: Dispatch<SetStateAction<number | null>>;
  filterTag: number | null;
  setFilterTag: Dispatch<SetStateAction<number | null>>;
  showFavorites: boolean;
  setShowFavorites: Dispatch<SetStateAction<boolean>>;
  setMode: Dispatch<SetStateAction<Mode>>;
  articles: { length: number };
  canWrite: boolean;
  categories: Category[];
  categoryTree: (Category & { children: Category[] })[];
  tags: Tag[];
  showCatManager: boolean;
  setShowCatManager: Dispatch<SetStateAction<boolean>>;
  newCatName: string;
  setNewCatName: Dispatch<SetStateAction<string>>;
  newCatParent: number | null;
  setNewCatParent: Dispatch<SetStateAction<number | null>>;
  handleCreateCategory: () => void;
  handleDeleteCategory: (cid: number) => void;
  handleCreateTag: () => void;
}

const KBSidebar = ({
  search,
  setSearch,
  filterCategory,
  setFilterCategory,
  filterTag,
  setFilterTag,
  showFavorites,
  setShowFavorites,
  setMode,
  articles,
  canWrite,
  categories,
  categoryTree,
  tags,
  showCatManager,
  setShowCatManager,
  newCatName,
  setNewCatName,
  newCatParent,
  setNewCatParent,
  handleCreateCategory,
  handleDeleteCategory,
  handleCreateTag,
}: KBSidebarProps) => {
  const renderCategoryNode = (cat: Category & { children: Category[] }, depth = 0) => (
    <div key={cat.id}>
      <button
        type="button"
        onClick={() => {
          setFilterCategory(cat.id);
          setFilterTag(null);
          setShowFavorites(false);
          setMode('list');
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left group',
          filterCategory === cat.id && 'bg-primary/10 text-primary font-medium',
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <Icon
          name={cat.icon || 'Folder'}
          size={16}
          className="shrink-0"
          style={{ color: cat.color || undefined }}
        />
        <span className="flex-1 truncate">{cat.name}</span>
        <span className="text-xs text-muted-foreground">{cat.articles_count}</span>
        {canWrite && (
          <Icon
            name="X"
            size={12}
            className="opacity-0 group-hover:opacity-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCategory(cat.id);
            }}
          />
        )}
      </button>
      {cat.children.map((c) => renderCategoryNode({ ...c, children: (c as Category & { children?: Category[] }).children || [] }, depth + 1))}
    </div>
  );

  return (
    <aside className="lg:w-64 shrink-0 space-y-3">
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-2 space-y-1">
          <button
            onClick={() => {
              setFilterCategory(null);
              setFilterTag(null);
              setShowFavorites(false);
              setMode('list');
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors',
              !filterCategory && !filterTag && !showFavorites && 'bg-primary/10 text-primary font-medium',
            )}
          >
            <Icon name="Layers" size={16} />
            <span className="flex-1 text-left">Все статьи</span>
            <span className="text-xs text-muted-foreground">{articles.length}</span>
          </button>
          <button
            onClick={() => {
              setShowFavorites(true);
              setFilterCategory(null);
              setFilterTag(null);
              setMode('list');
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors',
              showFavorites && 'bg-primary/10 text-primary font-medium',
            )}
          >
            <Icon name="Star" size={16} className="text-amber-500" />
            <span className="flex-1 text-left">Избранное</span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 space-y-1">
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Разделы</p>
            {canWrite && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setShowCatManager(!showCatManager)}
                title="Управление"
              >
                <Icon name="Plus" size={14} />
              </Button>
            )}
          </div>
          {showCatManager && canWrite && (
            <div className="p-2 space-y-2 border border-border rounded-md bg-muted/30">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Название раздела"
                className="h-8 text-sm"
              />
              <Select
                value={newCatParent ? String(newCatParent) : 'none'}
                onValueChange={(v) => setNewCatParent(v === 'none' ? null : Number(v))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Родитель (нет)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Корневой</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateCategory} className="w-full gap-1">
                <Icon name="Plus" size={14} />
                Создать
              </Button>
            </div>
          )}
          {categoryTree.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">Нет разделов</p>
          ) : (
            categoryTree.map((c) => renderCategoryNode(c))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2">
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Теги</p>
            {canWrite && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCreateTag} title="Добавить тег">
                <Icon name="Plus" size={14} />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 p-2">
            {tags.length === 0 && <p className="text-xs text-muted-foreground">Нет тегов</p>}
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setFilterTag(filterTag === t.id ? null : t.id);
                  setFilterCategory(null);
                  setShowFavorites(false);
                  setMode('list');
                }}
                className={cn(
                  'px-2 py-0.5 rounded-md text-xs border transition-colors',
                  filterTag === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent',
                )}
                style={t.color && filterTag !== t.id ? { borderColor: t.color, color: t.color } : undefined}
              >
                #{t.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
};

export default KBSidebar;
