import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
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
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';
import RichEditor from '@/components/kb/RichEditor';
import { cn } from '@/lib/utils';

const KB_URL = (func2url as Record<string, string>)['api-knowledge-base'];

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  parent_id: number | null;
  sort_order: number;
  articles_count: number;
}

interface Tag {
  id: number;
  name: string;
  color?: string | null;
  articles_count: number;
}

interface ArticleListItem {
  id: number;
  title: string;
  summary?: string | null;
  category_id: number | null;
  category_name?: string | null;
  category_color?: string | null;
  author_id: number | null;
  author_name?: string | null;
  views_count: number;
  likes_count: number;
  is_liked: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

interface ArticleFull extends ArticleListItem {
  content_html: string;
  content: object;
  is_published: boolean;
  files: { id: number; filename: string; url: string; size: number; mime_type: string }[];
  linked_tickets: { id: number; title: string; status_name?: string; status_color?: string }[];
  author_photo?: string;
}

interface Comment {
  id: number;
  article_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  user_name: string;
  user_photo?: string;
  created_at: string;
}

type Mode = 'list' | 'view' | 'edit' | 'new';

const KnowledgeBase = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canRead = hasPermission('knowledge_base', 'read');
  const canWrite =
    hasPermission('knowledge_base', 'write') ||
    hasPermission('knowledge_base', 'create') ||
    hasPermission('knowledge_base', 'update');

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [popular, setPopular] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ArticleListItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterTag, setFilterTag] = useState<number | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);

  const [mode, setMode] = useState<Mode>('list');
  const [activeArticle, setActiveArticle] = useState<ArticleFull | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // editor state
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [editPublished, setEditPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // category management
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState<number | null>(null);

  useEffect(() => {
    if (!canRead) navigate('/');
  }, [canRead, navigate]);

  const loadCategories = async () => {
    const res = await fetch(`${KB_URL}?endpoint=categories`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) setCategories(await res.json());
  };
  const loadTags = async () => {
    const res = await fetch(`${KB_URL}?endpoint=tags`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) setTags(await res.json());
  };
  const loadArticles = async () => {
    const params = new URLSearchParams({ endpoint: 'articles', limit: '100' });
    if (filterCategory) params.set('category_id', String(filterCategory));
    if (filterTag) params.set('tag_id', String(filterTag));
    if (showFavorites) params.set('favorites', '1');
    const res = await fetch(`${KB_URL}?${params}`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) setArticles(await res.json());
  };
  const loadPopular = async () => {
    const res = await fetch(`${KB_URL}?endpoint=popular`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) setPopular(await res.json());
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCategories(), loadTags(), loadPopular()]);
      setLoading(false);
    })();
     
  }, []);

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterTag, showFavorites]);

  // Поиск с дебаунсом
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`${KB_URL}?endpoint=search&q=${encodeURIComponent(search)}`, {
        headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
      });
      if (res.ok) setSearchResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openArticle = async (id: number) => {
    const res = await fetch(`${KB_URL}?endpoint=article&id=${id}`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (!res.ok) return;
    const a: ArticleFull = await res.json();
    setActiveArticle(a);
    setMode('view');
    // increment view
    fetch(`${KB_URL}?endpoint=view`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: id }),
    });
    // load comments
    const cr = await fetch(`${KB_URL}?endpoint=comments&article_id=${id}`, {
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (cr.ok) setComments(await cr.json());
  };

  const startNewArticle = () => {
    setActiveArticle(null);
    setEditTitle('');
    setEditSummary('');
    setEditContent('');
    setEditCategoryId(filterCategory);
    setEditTagIds([]);
    setEditPublished(true);
    setMode('new');
  };

  const startEditArticle = () => {
    if (!activeArticle) return;
    setEditTitle(activeArticle.title);
    setEditSummary(activeArticle.summary || '');
    setEditContent(activeArticle.content_html || '');
    setEditCategoryId(activeArticle.category_id);
    setEditTagIds(activeArticle.tags.map((t) => t.id));
    setEditPublished(activeArticle.is_published);
    setMode('edit');
  };

  const handleSaveArticle = async () => {
    if (!editTitle.trim()) {
      toast({ title: 'Заголовок обязателен', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const isNew = mode === 'new';
    try {
      const body: Record<string, unknown> = {
        title: editTitle,
        summary: editSummary,
        content_html: editContent,
        content: {},
        category_id: editCategoryId,
        tag_ids: editTagIds,
        is_published: editPublished,
      };
      if (!isNew && activeArticle) body.id = activeArticle.id;
      const res = await fetch(`${KB_URL}?endpoint=articles`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Не удалось сохранить', variant: 'destructive' });
        return;
      }
      toast({ title: 'Статья сохранена' });
      await loadArticles();
      const id = isNew ? data.id : activeArticle?.id;
      if (id) await openArticle(id);
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!activeArticle) return;
    if (!window.confirm('Удалить статью? Это действие необратимо.')) return;
    const res = await fetch(`${KB_URL}?endpoint=articles&id=${activeArticle.id}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) {
      toast({ title: 'Статья удалена' });
      setActiveArticle(null);
      setMode('list');
      await loadArticles();
    }
  };

  const toggleLike = async () => {
    if (!activeArticle) return;
    const res = await fetch(`${KB_URL}?endpoint=like`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: activeArticle.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setActiveArticle({ ...activeArticle, is_liked: d.liked, likes_count: d.likes_count });
    }
  };

  const toggleFavorite = async () => {
    if (!activeArticle) return;
    const res = await fetch(`${KB_URL}?endpoint=favorite`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: activeArticle.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setActiveArticle({ ...activeArticle, is_favorite: d.is_favorite });
    }
  };

  const handleAddComment = async () => {
    if (!activeArticle || !newComment.trim()) return;
    const res = await fetch(`${KB_URL}?endpoint=comments`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: activeArticle.id, content: newComment }),
    });
    if (res.ok) {
      setNewComment('');
      const cr = await fetch(`${KB_URL}?endpoint=comments&article_id=${activeArticle.id}`, {
        headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
      });
      if (cr.ok) setComments(await cr.json());
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!activeArticle) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await fetch(`${KB_URL}?endpoint=files`, {
        method: 'POST',
        headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: activeArticle.id,
          filename: file.name,
          mime_type: file.type,
          content_base64: base64,
        }),
      });
      if (res.ok) {
        toast({ title: 'Файл загружен' });
        await openArticle(activeArticle.id);
      } else {
        const e = await res.json();
        toast({ title: e.error || 'Ошибка загрузки', variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFile = async (fid: number) => {
    if (!activeArticle) return;
    if (!window.confirm('Удалить файл?')) return;
    const res = await fetch(`${KB_URL}?endpoint=files&id=${fid}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) await openArticle(activeArticle.id);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch(`${KB_URL}?endpoint=categories`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName, parent_id: newCatParent }),
    });
    if (res.ok) {
      setNewCatName('');
      setNewCatParent(null);
      await loadCategories();
      toast({ title: 'Категория создана' });
    }
  };

  const handleDeleteCategory = async (cid: number) => {
    if (!window.confirm('Удалить категорию? Статьи внутри останутся без категории.')) return;
    const res = await fetch(`${KB_URL}?endpoint=categories&id=${cid}`, {
      method: 'DELETE',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '' },
    });
    if (res.ok) {
      await loadCategories();
      if (filterCategory === cid) setFilterCategory(null);
    }
  };

  const handleCreateTag = async () => {
    const name = window.prompt('Название тега:');
    if (!name) return;
    const res = await fetch(`${KB_URL}?endpoint=tags`, {
      method: 'POST',
      headers: { 'X-Auth-Token': localStorage.getItem('authToken') || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) await loadTags();
  };

  const categoryTree = useMemo(() => {
    const map = new Map<number, Category & { children: Category[] }>();
    categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
    const roots: (Category & { children: Category[] })[] = [];
    map.forEach((c) => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.children.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [categories]);

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

  if (!canRead) return null;

  return (
    <PageLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* === Sidebar === */}
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

        {/* === Main === */}
        <main className="flex-1 min-w-0">
          {search.trim() ? (
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
          ) : mode === 'list' ? (
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
          ) : mode === 'view' && activeArticle ? (
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
                    {new Date(activeArticle.updated_at).toLocaleDateString()}
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
                            <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
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
          ) : (mode === 'edit' || mode === 'new') ? (
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
          ) : null}
        </main>

        {/* === Right column: popular === */}
        {mode === 'list' && !search.trim() && popular.length > 0 && (
          <aside className="lg:w-64 shrink-0">
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Icon name="TrendingUp" size={14} />
                  Популярное
                </h3>
                <ul className="space-y-1">
                  {popular.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => openArticle(a.id)}
                        className="w-full text-left p-2 rounded-md hover:bg-accent text-xs"
                      >
                        <p className="font-medium line-clamp-2">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-0.5">
                            <Icon name="Eye" size={10} />
                            {a.views_count}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Icon name="Heart" size={10} />
                            {a.likes_count}
                          </span>
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </PageLayout>
  );
};

export default KnowledgeBase;
