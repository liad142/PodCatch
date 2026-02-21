'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useIsAdmin(): boolean {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      setIsAdmin(false);
      return;
    }

    fetch('/api/admin/overview')
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));
  }, [user, isLoading]);

  return isAdmin;
}
