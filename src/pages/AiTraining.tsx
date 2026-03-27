import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import func2url from '../../backend/func2url.json';
import ExamplesTab from '@/components/ai-training/ExamplesTab';
import RulesTab from '@/components/ai-training/RulesTab';
import TestTab from '@/components/ai-training/TestTab';
import type { TrainingExample, TicketService, Service } from '@/components/ai-training/ExamplesTab';
import type { TrainingRule } from '@/components/ai-training/RulesTab';

const AI_TRAINING_URL = func2url['api-ai-training'];

const AiTraining = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'examples' | 'rules' | 'test'>('examples');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({ examples_count: 0, active_rules_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('settings', 'read')) {
      navigate('/tickets');
      return;
    }
    loadData();
  }, [hasPermission, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exRes, rulesRes, statsRes, tsRes, svcRes] = await Promise.all([
        apiFetch(`${AI_TRAINING_URL}?endpoint=examples`),
        apiFetch(`${AI_TRAINING_URL}?endpoint=rules`),
        apiFetch(`${AI_TRAINING_URL}?endpoint=stats`),
        apiFetch('/ticket_services?endpoint=ticket_services'),
        apiFetch('/services?endpoint=services'),
      ]);

      if (exRes.ok) setExamples(await exRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTicketServices(Array.isArray(tsData) ? tsData : tsData.ticket_services || []);
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices(Array.isArray(svcData) ? svcData : []);
      }
    } catch (err) {
      console.error('Failed to load AI training data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Обучение AI</h1>
            <p className="text-sm text-muted-foreground">
              Примеры и правила для автоматической классификации заявок
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Icon name="BookOpen" size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.examples_count}</p>
                <p className="text-xs text-muted-foreground">Примеров заявок</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Icon name="Lightbulb" size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_rules_count}</p>
                <p className="text-xs text-muted-foreground">Активных правил</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === 'examples' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('examples')}
          className="gap-2"
        >
          <Icon name="BookOpen" size={16} />
          Примеры заявок
        </Button>
        <Button
          variant={tab === 'rules' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('rules')}
          className="gap-2"
        >
          <Icon name="Lightbulb" size={16} />
          Правила
        </Button>
        <Button
          variant={tab === 'test' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('test')}
          className="gap-2"
        >
          <Icon name="Play" size={16} />
          Тестирование
        </Button>
      </div>

      {tab === 'examples' && (
        <ExamplesTab
          examples={examples}
          ticketServices={ticketServices}
          services={services}
          onReload={loadData}
        />
      )}

      {tab === 'rules' && (
        <RulesTab
          rules={rules}
          onReload={loadData}
        />
      )}

      {tab === 'test' && (
        <TestTab />
      )}
    </PageLayout>
  );
};

export default AiTraining;
