import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/utils/api';

const AwaitingResponseBadge = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !token) return;

    let active = true;
    const load = async () => {
      try {
        const res = await apiFetch(`${API_URL}?endpoint=tickets&action=awaiting_count`, {
          headers: { 'X-Auth-Token': token },
        });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setCount(Number(data.count) || 0);
        }
      } catch (e) {
        console.error('[AwaitingResponseBadge] fetch error', e);
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, token]);

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-foreground hover:bg-foreground/10"
      title={count > 0 ? `${count} заявок ждут твоего ответа` : 'Нет заявок, ожидающих ответа'}
      onClick={() => navigate('/tickets')}
    >
      <Icon name="Hand" size={20} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Button>
  );
};

export default AwaitingResponseBadge;
