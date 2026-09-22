import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import {
  createUser,
  fetchActiveUsers,
  fetchManagers,
  fetchUsers,
  restoreUser,
  softDeleteUser,
  updateUser,
} from '@/services/usersService';
import type { UserFormData } from '@/types';

export function useUsers(includeDeleted = false) {
  return useQuery({
    queryKey: QUERY_KEYS.users(includeDeleted),
    queryFn: () => fetchUsers(includeDeleted),
  });
}

export function useManagers() {
  return useQuery({
    queryKey: [...QUERY_KEYS.users(false), 'managers'] as const,
    queryFn: fetchManagers,
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: [...QUERY_KEYS.users(false), 'active'] as const,
    queryFn: fetchActiveUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actorEmail }: { data: UserFormData; actorEmail: string }) =>
      createUser(data, actorEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actorEmail,
    }: {
      id: string;
      data: Pick<UserFormData, 'name' | 'phone' | 'notes' | 'email' | 'role' | 'permissions' | 'noLogin'>;
      actorEmail: string;
    }) => updateUser(id, data, actorEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actorEmail }: { id: string; actorEmail: string }) =>
      softDeleteUser(id, actorEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actorEmail }: { id: string; actorEmail: string }) =>
      restoreUser(id, actorEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
