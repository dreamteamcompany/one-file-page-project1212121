import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { ArticleListItem } from './types';

interface KBPopularSidebarProps {
  popular: ArticleListItem[];
  openArticle: (id: number) => void;
}

const KBPopularSidebar = ({ popular, openArticle }: KBPopularSidebarProps) => {
  return (
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
  );
};

export default KBPopularSidebar;
