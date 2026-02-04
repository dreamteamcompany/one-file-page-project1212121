import { useState, useEffect } from 'react';
import { apiFetch, API_URL } from '@/utils/api';

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface GroupedPermissions {
  [resource: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    remove: boolean;
  };
}

interface UserPermissionsData {
  user_id: number;
  permissions: Permission[];
  grouped: GroupedPermissions;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`${API_URL}?endpoint=user-permissions`);
      
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
        setError(null);
      } else {
        setError('Failed to load permissions');
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  const can = (resource: string, action: string): boolean => {
    if (!permissions) return false;
    return permissions.grouped[resource]?.[action as keyof typeof permissions.grouped[typeof resource]] || false;
  };

  const canAny = (resource: string): boolean => {
    if (!permissions) return false;
    const resourcePerms = permissions.grouped[resource];
    if (!resourcePerms) return false;
    return Object.values(resourcePerms).some(value => value === true);
  };

  return {
    permissions,
    loading,
    error,
    can,
    canAny,
    reload: loadPermissions,
  };
};
