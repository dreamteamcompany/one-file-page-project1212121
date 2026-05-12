import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { ReportListItem } from './types';

interface ReportsTabProps {
  reportsLoading: boolean;
  reports: ReportListItem[];
  onOpenReport: (id: number) => void;
}

const ReportsTab = ({ reportsLoading, reports, onOpenReport }: ReportsTabProps) => {
  return (
    <>
      {reportsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">История блокировок: {reports.length}</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="FileText" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Отчётов пока нет</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenReport(r.id)}
                    className="w-full text-left p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {r.started_at ? new Date(r.started_at).toLocaleString('ru-RU') : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.started_by_name || '—'}
                        {r.days_threshold ? ` · порог ${r.days_threshold} дн.` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs text-red-700 border-red-300 bg-red-50">
                        {r.deactivated_count} забл.
                      </Badge>
                      {r.errors_count > 0 && (
                        <Badge variant="outline" className="text-xs text-orange-700 border-orange-300 bg-orange-50">
                          {r.errors_count} ош.
                        </Badge>
                      )}
                      {r.skipped_count > 0 && (
                        <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">
                          {r.skipped_count} пр.
                        </Badge>
                      )}
                      <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ReportsTab;
