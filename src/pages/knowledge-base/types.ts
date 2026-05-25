export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  parent_id: number | null;
  sort_order: number;
  articles_count: number;
}

export interface Tag {
  id: number;
  name: string;
  color?: string | null;
  articles_count: number;
}

export interface ArticleListItem {
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

export interface ArticleFull extends ArticleListItem {
  content_html: string;
  content: object;
  is_published: boolean;
  files: { id: number; filename: string; url: string; size: number; mime_type: string }[];
  linked_tickets: { id: number; title: string; status_name?: string; status_color?: string }[];
  author_photo?: string;
}

export interface Comment {
  id: number;
  article_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  user_name: string;
  user_photo?: string;
  created_at: string;
}

export type Mode = 'list' | 'view' | 'edit' | 'new';

export const getStoredAuthToken = (): string => {
  const rememberMe = localStorage.getItem('remember_me') === 'true';
  const t = rememberMe
    ? localStorage.getItem('auth_token')
    : sessionStorage.getItem('auth_token');
  return t || localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
};
