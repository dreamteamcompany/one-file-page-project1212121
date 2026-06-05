import { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
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
  setFilterCategory: Dispatch<SetStateAction<number | null>>;
  filterTag: number | null;
  setFilterTag: Dispatch<SetStateAction<number | null>>;
  setShowFavorites: Dispatch<SetStateAction<boolean>>;
  categories: Category[];
  categoryTree: (Category & { children: Category[] })[];
  tags: Tag[];
  isHome: boolean;
  popular: ArticleListItem[];
  sortBy: 'new' | 'popular';
  setSortBy: Dispatch<SetStateAction<'new' | 'popular'>>;
  openArticle: (id: number) => void;
  startNewArticle: () => void;
}

const ArticleCard = ({
  a,
  openArticle,
}: {
  a: ArticleListItem;
  openArticle: (id: number) => void;
}) => (
  <button
    onClick={() => openArticle(a.id)}
    className="text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition bg-card flex flex-col gap-2"
  >
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{a.title}</h3>
      {a.is_favorite && <Icon name="Star" size={14} className="text-amber-500 shrink-0" />}
    </div>
    {a.summary && <p className="text-xs text-muted-foreground line-clamp-2">{a.summary}</p>}
    {(a.tags?.length ?? 0) > 0 && (
      <div className="flex flex-wrap gap-1">
        {a.tags.slice(0, 3).map((t) => (
          <span
            key={t.id}
            className="text-[10px] px-1.5 py-0.5 rounded-full border"
            style={t.color ? { borderColor: t.color, color: t.color } : undefined}
          >
            #{t.name}
          </span>
        ))}
      </div>
    )}
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
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
);

const KBArticleList = ({
  search,
  setSearch,
  searchResults,
  articles,
  loading,
  canWrite,
  showFavorites,
  filterCategory,
  setFilterCategory,
  filterTag,
  setFilterTag,
  setShowFavorites,
  categories,
  categoryTree,
  tags,
  isHome,
  popular,
  sortBy,
  setSortBy,
  openArticle,
  startNewArticle,
}: KBArticleListProps) => {
  // === Search results ===
  if (search.trim()) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
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

  // === Home: Help Center style ===
  if (isHome) {
    return (
      <div className="space-y-6">
        {/* Hero with big search */}
        <Card className="border-border overflow-hidden">
          <CardContent className="p-6 md:p-10 text-center bg-gradient-to-b from-primary/5 to-transparent">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Icon name="BookOpen" size={28} className="text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">База знаний</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-5">
              Найдите ответ или выберите раздел ниже
            </p>
            <div className="relative max-w-xl mx-auto">
              <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Что вы ищете?"
                className="pl-11 h-12 text-base rounded-full"
              />
            </div>
            {canWrite && (
              <Button onClick={startNewArticle} className="gap-2 mt-5">
                <Icon name="Plus" size={16} />
                Новая статья
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Section tiles */}
        {categoryTree.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Разделы</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTree.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFilterCategory(cat.id);
                    setFilterTag(null);
                    setShowFavorites(false);
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition text-left"
                >
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                    style={{ backgroundColor: `${cat.color || '#7c3aed'}20` }}
                  >
                    <Icon name={cat.icon || 'Folder'} size={20} style={{ color: cat.color || '#7c3aed' }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-sm truncate">{cat.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {cat.articles_count} {cat.articles_count === 1 ? 'статья' : 'статей'}
                      {cat.children.length > 0 && ` · ${cat.children.length} подразделов`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular articles */}
        {popular.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Icon name="TrendingUp" size={16} />
              Популярное
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {popular.slice(0, 6).map((a) => (
                <ArticleCard key={a.id} a={a} openArticle={openArticle} />
              ))}
            </div>
          </div>
        )}

        {/* All articles */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Все статьи</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Статей пока нет</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} a={a} openArticle={openArticle} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Filtered list (category / tag / favorites) ===
  const title = showFavorites
    ? 'Избранное'
    : filterCategory
    ? categories.find((c) => c.id === filterCategory)?.name
    : filterTag
    ? `#${tags.find((t) => t.id === filterTag)?.name}`
    : 'Статьи';

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <button
              onClick={() => {
                setFilterCategory(null);
                setFilterTag(null);
                setShowFavorites(false);
              }}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-1"
            >
              <Icon name="ChevronLeft" size={12} />
              База знаний
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">{title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Загрузка...' : `${articles.length} ${articles.length === 1 ? 'статья' : 'статей'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setSortBy('new')}
                className={cn('px-3 py-1.5 text-xs', sortBy === 'new' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                Новые
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={cn('px-3 py-1.5 text-xs', sortBy === 'popular' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
              >
                Популярные
              </button>
            </div>
            {canWrite && (
              <Button onClick={startNewArticle} className="gap-2">
                <Icon name="Plus" size={16} />
                Новая статья
              </Button>
            )}
          </div>
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
              <ArticleCard key={a.id} a={a} openArticle={openArticle} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KBArticleList;