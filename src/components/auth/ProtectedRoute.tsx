import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource: string;
  action: string;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, resource, action, redirectTo = '/tickets' }: ProtectedRouteProps) => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission(resource, action)) {
      navigate(redirectTo);
    }
  }, [hasPermission, resource, action, redirectTo, navigate]);

  if (!hasPermission(resource, action)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
