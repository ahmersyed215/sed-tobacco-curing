import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import {
  fetchInstallationsWithCalculations,
  fetchInstallationById,
  fetchPaymentsByInstallationId,
  fetchAllPayments,
  createInstallation,
  updateInstallation,
  deleteInstallation,
  addPayment,
  updatePayment,
  deletePayment,
  updateFollowupDate,
  checkReceiptIdExists,
  checkReceiptIdUsedElsewhere,
  previewNextReceiptId,
} from '@/services/installationService';
import type { InstallationFormData, PaymentFormData, DeviceType } from '@/types';

export function useInstallations() {
  return useQuery({
    queryKey: QUERY_KEYS.installations,
    queryFn: fetchInstallationsWithCalculations,
  });
}

export function useInstallation(id: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.installation(id ?? ''),
    queryFn: () => fetchInstallationById(id!),
    enabled: !!id,
  });
}

export function usePayments(installationId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.payments(installationId ?? ''),
    queryFn: () => fetchPaymentsByInstallationId(installationId!),
    enabled: !!installationId,
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: QUERY_KEYS.allPayments,
    queryFn: fetchAllPayments,
  });
}

export function useCreateInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, userEmail }: { data: InstallationFormData; userEmail: string }) =>
      createInstallation(data, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useUpdateInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstallationFormData }) =>
      updateInstallation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useDeleteInstallation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInstallation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      installationId,
      data,
      userEmail,
    }: {
      installationId: string;
      data: PaymentFormData;
      userEmail: string;
    }) => addPayment(installationId, data, userEmail),
    onSuccess: (_, { installationId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      installationId,
      paymentId,
      data,
    }: {
      installationId: string;
      paymentId: string;
      data: PaymentFormData;
    }) => updatePayment(installationId, paymentId, data),
    onSuccess: (_, { installationId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ installationId, paymentId }: { installationId: string; paymentId: string }) =>
      deletePayment(installationId, paymentId),
    onSuccess: (_, { installationId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payments(installationId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allPayments });
    },
  });
}

export function useUpdateFollowupDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, followupDate }: { id: string; followupDate: Date | null }) =>
      updateFollowupDate(id, followupDate),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installations });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.installation(id) });
    },
  });
}

export function useCheckReceiptId(receiptId: string, enabled = false) {
  return useQuery({
    queryKey: QUERY_KEYS.receiptExists(receiptId),
    queryFn: () => checkReceiptIdExists(receiptId),
    enabled: enabled && receiptId.length > 0,
  });
}

export function useCheckReceiptIdUsedElsewhere(
  installationId: string,
  receiptId: string,
  enabled = false,
  excludePaymentId?: string,
) {
  return useQuery({
    queryKey: ['receiptUsedElsewhere', installationId, receiptId, excludePaymentId ?? ''],
    queryFn: () => checkReceiptIdUsedElsewhere(receiptId, installationId, excludePaymentId),
    enabled: enabled && receiptId.trim().length > 0,
  });
}

export function usePreviewNextReceiptId(deviceType: DeviceType, enabled = false) {
  return useQuery({
    queryKey: QUERY_KEYS.nextReceiptId(deviceType),
    queryFn: () => previewNextReceiptId(deviceType),
    enabled,
    staleTime: 0,
  });
}
