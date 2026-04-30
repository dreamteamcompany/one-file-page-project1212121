import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

export interface ReportItem {
  bitrix_user_id: string;
  full_name: string;
  email: string;
  position: string;
  last_login: string | null;
  days_inactive: number | null;
  status: 'deactivated' | 'error' | 'skipped' | string;
  error_text: string;
}

export interface BlockReport {
  id: number;
  started_by_name: string;
  started_at: string | null;
  mode: string;
  days_threshold: number | null;
  total_requested: number;
  deactivated_count: number;
  errors_count: number;
  skipped_count: number;
  items: ReportItem[];
}

const MODE_LABELS: Record<string, string> = {
  all: 'Всех неактивных',
  never_logged: 'Кто никогда не заходил',
  long_inactive: 'Кто долго не заходил',
  by_ids: 'Точечно по списку',
};

const STATUS_LABELS: Record<string, string> = {
  deactivated: 'Заблокирован',
  error: 'Ошибка',
  skipped: 'Пропущен (исключение)',
};

const csvEscape = (val: unknown): string => {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[";,\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const downloadCSV = (report: BlockReport) => {
  const headers = [
    'ID Битрикс',
    'ФИО',
    'Email',
    'Должность',
    'Последний вход',
    'Дней без входа',
    'Статус',
    'Ошибка',
  ];

  const lines = [headers.map(csvEscape).join(';')];
  for (const it of report.items) {
    lines.push([
      it.bitrix_user_id,
      it.full_name,
      it.email,
      it.position,
      it.last_login ? new Date(it.last_login).toLocaleString('ru-RU') : 'Никогда',
      it.days_inactive ?? '',
      STATUS_LABELS[it.status] || it.status,
      it.error_text || '',
    ].map(csvEscape).join(';'));
  }

  lines.push('');
  lines.push('Сводка');
  lines.push(['Запустил', csvEscape(report.started_by_name)].join(';'));
  lines.push(['Дата', csvEscape(report.started_at ? new Date(report.started_at).toLocaleString('ru-RU') : '')].join(';'));
  lines.push(['Режим', csvEscape(MODE_LABELS[report.mode] || report.mode)].join(';'));
  lines.push(['Порог (дней)', csvEscape(report.days_threshold ?? '')].join(';'));
  lines.push(['Всего обработано', csvEscape(report.total_requested)].join(';'));
  lines.push(['Заблокировано', csvEscape(report.deactivated_count)].join(';'));
  lines.push(['Ошибок', csvEscape(report.errors_count)].join(';'));
  lines.push(['Пропущено (исключения)', csvEscape(report.skipped_count)].join(';'));

  const csv = '\ufeff' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = report.started_at ? new Date(report.started_at).toISOString().slice(0, 10) : 'report';
  a.download = `bitrix-block-report-${report.id}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'deactivated') {
    return <Badge variant="outline" className="text-xs text-red-700 border-red-300 bg-red-50">Заблокирован</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="outline" className="text-xs text-orange-700 border-orange-300 bg-orange-50">Ошибка</Badge>;
  }
  if (status === 'skipped') {
    return <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">Пропущен</Badge>;
  }
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: BlockReport | null;
}

const BlockReportModal = ({ open, onOpenChange, report }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Отчёт о блокировке</DialogTitle>
          <DialogDescription>
            {report ? (
              <>
                Запустил: <strong>{report.started_by_name || '—'}</strong>
                {report.started_at && <> · {new Date(report.started_at).toLocaleString('ru-RU')}</>}
                {' · '}Режим: {MODE_LABELS[report.mode] || report.mode}
                {report.days_threshold ? ` · Порог: ${report.days_threshold} дн.` : ''}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {report && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
              <div className="rounded-lg border p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">Всего</p>
                <p className="text-xl font-bold">{report.total_requested}</p>
              </div>
              <div className="rounded-lg border p-3 bg-red-50 border-red-200">
                <p className="text-xs text-red-700">Заблокировано</p>
                <p className="text-xl font-bold text-red-700">{report.deactivated_count}</p>
              </div>
              <div className="rounded-lg border p-3 bg-orange-50 border-orange-200">
                <p className="text-xs text-orange-700">Ошибок</p>
                <p className="text-xl font-bold text-orange-700">{report.errors_count}</p>
              </div>
              <div className="rounded-lg border p-3 bg-emerald-50 border-emerald-200">
                <p className="text-xs text-emerald-700">Пропущено</p>
                <p className="text-xl font-bold text-emerald-700">{report.skipped_count}</p>
              </div>
            </div>

            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => downloadCSV(report)}>
                <Icon name="Download" size={14} />
                Скачать CSV
              </Button>
            </div>

            <div className="overflow-auto border rounded-lg flex-1">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">ФИО</th>
                    <th className="text-left p-2 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left p-2 font-medium hidden md:table-cell">Должность</th>
                    <th className="text-left p-2 font-medium hidden lg:table-cell">Последний вход</th>
                    <th className="text-left p-2 font-medium">Дней</th>
                    <th className="text-left p-2 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-6 text-muted-foreground">
                        Нет записей
                      </td>
                    </tr>
                  ) : (
                    report.items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{it.full_name || '—'}</td>
                        <td className="p-2 hidden sm:table-cell text-muted-foreground">{it.email || '—'}</td>
                        <td className="p-2 hidden md:table-cell text-muted-foreground">{it.position || '—'}</td>
                        <td className="p-2 hidden lg:table-cell text-muted-foreground">
                          {it.last_login ? new Date(it.last_login).toLocaleDateString('ru-RU') : 'Никогда'}
                        </td>
                        <td className="p-2">{it.days_inactive ?? '—'}</td>
                        <td className="p-2">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={it.status} />
                            {it.error_text && it.status === 'error' && (
                              <span className="text-xs text-muted-foreground" title={it.error_text}>
                                {it.error_text.length > 60 ? it.error_text.slice(0, 60) + '…' : it.error_text}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BlockReportModal;
