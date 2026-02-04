import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard = ({ resource, action, children, fallback = null }: PermissionGuardProps) => {
  const { can, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const AnyPermissionGuard = ({ resource, children, fallback = null }: AnyPermissionGuardProps) => {
  const { canAny, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (!canAny(resource)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
