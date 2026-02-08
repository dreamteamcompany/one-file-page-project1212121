import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Logo from '@/components/ui/Logo';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const getFirstAvailableRoute = (user: { permissions?: Array<{ resource: string; action: string }> }) => {
    const hasPermission = (resource: string, action: string) => {
      return user?.permissions?.some(
        (p) => p.resource === resource && p.action === action
      );
    };

    if (hasPermission('dashboard', 'read')) return '/';
    if (hasPermission('tickets', 'read')) return '/tickets';
    if (hasPermission('users', 'read')) return '/users';
    if (hasPermission('roles', 'read')) return '/roles';
    if (hasPermission('settings', 'read')) return '/settings';
    
    return '/tickets';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, rememberMe);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://functions.poehali.dev/api'}?endpoint=me`, {
        headers: {
          'X-Auth-Token': sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || '',
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        const route = getFirstAvailableRoute(userData);
        navigate(route);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1729] to-[#1b254b] p-4">
      <Card className="w-full max-w-md border-white/10 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo className="h-10 w-auto text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Вход в систему</CardTitle>
          <CardDescription>
            Служба технической поддержки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                <Icon name="AlertCircle" size={16} />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Запомнить меня
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icon name="Loader2" size={18} className="animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <Icon name="LogIn" size={18} />
                  Войти
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;