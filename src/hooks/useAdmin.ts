import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasPermission } from '@/auth/access';
import { NAV_ITEMS, QUERY_KEYS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import type { BatchProgressCallback } from '@/firebase/batchUtils';
import { deleteAllApplicationData } from '@/services/adminDataService';
import { fetchUserById, subscribeToUser } from '@/services/usersService';
import type { Permission } from '@/types';

export function useCurrentUserProfile() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.user(user?.uid ?? ''),
    queryFn: () => fetchUserById(user!.uid),
    enabled: !!user?.uid && !loading,
  });

  useEffect(() => {
    if (!user?.uid || loading) return;
    return subscribeToUser(user.uid, (profile) => {
      queryClient.setQueryData(QUERY_KEYS.user(user.uid), profile);
    });
  }, [user?.uid, loading, queryClient]);

  return query;
}

export function useAccess() {
  const { user, loading: authLoading } = useAuth();
  const profileQuery = useCurrentUserProfile();
  const profile = profileQuery.data ?? null;

  const can = (permission: Permission) => hasPermission(profile, permission);
  const allowedPath = NAV_ITEMS.find((item) => can(item.permission))?.path ?? null;

  return {
    ...profileQuery,
    profile,
    isSuperAdmin: profile?.role === 'super_admin',
    can,
    allowedPath,
    isLoading: authLoading || (!!user && profileQuery.isPending),
  };
}

export function useDeleteAllApplicationData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (onProgress?: BatchProgressCallback) => {
      if (!user?.uid) throw new Error('You must be logged in.');
      return deleteAllApplicationData(user.uid, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}
