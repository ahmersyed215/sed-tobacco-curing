import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAdmin';
import {
  createExpense,
  createExpenseInflow,
  deleteExpense,
  deleteExpenseInflow,
  fetchExpenseInflows,
  fetchExpenses,
  updateExpense,
  updateExpenseInflow,
  type ExpenseVisibility,
} from '@/services/expenseService';
import type { ExpenseFormData, ExpenseInflowFormData } from '@/types';

function actorName(name: string | undefined, email: string | null | undefined): string {
  return name?.trim() || email || 'Unknown';
}

function useExpenseVisibility(): { visibility: ExpenseVisibility | null; scope: string; ready: boolean } {
  const { user } = useAuth();
  const { isSuperAdmin, profile, isLoading } = useAccess();

  if (isLoading || !user?.uid || !profile) {
    return { visibility: null, scope: '', ready: false };
  }

  if (isSuperAdmin) {
    return { visibility: { mode: 'all' }, scope: 'all', ready: true };
  }

  if (profile.role === 'manager') {
    return {
      visibility: { mode: 'wallet', uid: user.uid },
      scope: `wallet:${user.uid}`,
      ready: true,
    };
  }

  return {
    visibility: { mode: 'created', uid: user.uid },
    scope: `created:${user.uid}`,
    ready: true,
  };
}

export function useExpenses() {
  const { visibility, scope, ready } = useExpenseVisibility();

  return useQuery({
    queryKey: QUERY_KEYS.expenses(scope),
    queryFn: () => fetchExpenses(visibility!),
    enabled: ready,
  });
}

export function useExpenseInflows() {
  const { visibility, scope, ready } = useExpenseVisibility();
  const { profile } = useAccess();
  const canViewInflows = profile?.role === 'super_admin' || profile?.role === 'manager';

  return useQuery({
    queryKey: QUERY_KEYS.expenseInflows(scope),
    queryFn: () => fetchExpenseInflows(visibility!),
    enabled: ready && canViewInflows,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useAccess();

  return useMutation({
    mutationFn: (data: ExpenseFormData) => {
      if (!user?.uid) throw new Error('You must be logged in.');
      return createExpense(data, { uid: user.uid, name: actorName(profile?.name, user.email) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useCreateExpenseInflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useAccess();

  return useMutation({
    mutationFn: (data: ExpenseInflowFormData) => {
      if (!user?.uid) throw new Error('You must be logged in.');
      if (profile?.role !== 'super_admin' && profile?.role !== 'manager') {
        throw new Error('Only managers and super admins can record reimbursements.');
      }
      return createExpenseInflow(data, {
        uid: user.uid,
        name: actorName(profile?.name, user.email),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseInflows'] });
    },
  });
}

export function useUpdateExpenseInflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseInflowFormData }) =>
      updateExpenseInflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseInflows'] });
    },
  });
}

export function useDeleteExpenseInflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpenseInflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseInflows'] });
    },
  });
}
