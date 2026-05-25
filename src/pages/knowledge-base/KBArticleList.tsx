import { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { ArticleListItem, Category, Tag } from './types';

interface KBArticleListProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchResults: ArticleListItem[];
  articles: ArticleListItem[];
  loading: boolean;
  canWrite: boolean;
  showFavorites: boolean;
  filterCategory: number | null;
  filterTag: number | null;
  categories: Category[];
  tags: Tag[];
  openArticle: (id: number) => void;
  startNewArticle: () => void;
}

const KBArticleList = ({
  search,
  setSearch,
  searchResults,
  articles,
  loading,
  canWrite,
  showFavorites,
  filterCategory,
  filterTag,
  categories,
  tags,
  openArticle,
  startNewArticle,
}: KBArticleListProps) => {
  if (search.trim()) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Icon name="Search" size={18} />
            Результаты поиска
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ничего не найдено</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => {
                      setSearch('');
                      openArticle(a.id);
                    }}
                    className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                  >
                    <p className="font-medium">{a.title}</p>
                    {a.summary && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.summary}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.category_name && <span className="mr-2">{a.category_name}</span>}
                      <Icon name="Eye" size={10} className="inline mr-0.5" />
                      {a.views_count}
                      <Icon name="Heart" size={10} className="inline ml-2 mr-0.5" />
                      {a.likes_count}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Icon name="BookOpen" size={22} className="text-primary" />
              {showFavorites
                ? 'Избранное'
                : filterCategory
                ? categories.find((c) => c.id === filterCategory)?.name
                : filterTag
                ? `#${tags.find((t) => t.id === filterTag)?.name}`
                : 'База знаний'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? 'Загрузка...' : `${articles.length} ${articles.length === 1 ? 'статья' : 'статей'}`}
            </p>
          </div>
          {canWrite && (
            <Button onClick={startNewArticle} className="gap-2">
              <Icon name="Plus" size={16} />
              Новая статья
            </Button>
          )}
        </header>

        {articles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="FileText" size={48} className="mx-auto mb-3 opacity-30" />
            <p>Статей пока нет</p>
            {canWrite && (
              <Button onClick={startNewArticle} variant="outline" className="mt-3 gap-2">
                <Icon name="Plus" size={14} />
                Создать первую
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {articles.map((a) => (
              <button
                key={a.id}
                onClick={() => openArticle(a.id)}
                className="text-left p-4 rounded-lg border border-border hover:border-primary/40 hover:shadow-sm transition bg-background"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{a.title}</h3>
                  {a.is_favorite && <Icon name="Star" size={14} className="text-amber-500 shrink-0" />}
                </div>
                {a.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.summary}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {a.tags.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="text-[10px] px-1.5 py-0.5 rounded border"
                      style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {a.category_name && (
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={a.category_color ? { backgroundColor: `${a.category_color}20`, color: a.category_color } : undefined}
                    >
                      {a.category_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Icon name="Eye" size={11} />
                    {a.views_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Heart" size={11} className={a.is_liked ? 'fill-red-500 text-red-500' : ''} />
                    {a.likes_count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KBArticleList;
