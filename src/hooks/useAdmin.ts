import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import type { BatchProgressCallback } from '@/firebase/batchUtils';
import { deleteAllApplicationData } from '@/services/adminDataService';
import { fetchUserById } from '@/services/usersService';

export function useCurrentUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.user(user?.uid ?? ''),
    queryFn: () => fetchUserById(user!.uid),
    enabled: !!user?.uid,
  });
}

export function useIsAdmin() {
  const { data: profile, isLoading } = useCurrentUserProfile();
  return {
    isAdmin: profile?.role === 'admin',
    isLoading,
    profile,
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
