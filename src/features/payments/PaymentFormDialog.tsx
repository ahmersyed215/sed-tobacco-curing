import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import type { Payment, PaymentFormData } from '@/types';
import { formatAmountInput, formatDateInput, parseAmountInput } from '@/utils';
import { useCheckReceiptIdUsedElsewhere } from '@/hooks/useInstallations';

const schema = yup.object({
  receiptId: yup.string().required('Receipt ID is required'),
  amount: yup.number().min(0.01, 'Amount must be greater than 0').required('Amount is required'),
  paymentDate: yup.date().required('Payment date is required'),
  notes: yup.string().optional(),
  autoGenerateReceipt: yup.boolean().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  installationId: string;
  installationReceiptId?: string;
  maxAmount?: number;
  initialData?: Payment;
  loading?: boolean;
}

export function PaymentFormDialog({
  open,
  onClose,
  onSubmit,
  installationId,
  installationReceiptId,
  maxAmount,
  initialData,
  loading,
}: Props) {
  const isEdit = Boolean(initialData);
  const hasInstallationReceipt = Boolean(installationReceiptId?.trim());
  const lockReceipt = !isEdit && hasInstallationReceipt;

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      receiptId: installationReceiptId ?? initialData?.receiptId ?? '',
      amount: initialData?.amount ?? 0,
      paymentDate: initialData?.paymentDate ?? new Date(),
      notes: initialData?.notes ?? '',
      autoGenerateReceipt: false,
    },
  });

  const receiptIdValue = watch('receiptId') ?? '';
  const shouldCheckReceipt =
    !lockReceipt && receiptIdValue.trim().length > 0;
  const { data: receiptUsedElsewhere } = useCheckReceiptIdUsedElsewhere(
    installationId,
    receiptIdValue,
    shouldCheckReceipt,
    isEdit ? initialData?.id : undefined,
  );

  useEffect(() => {
    if (open) {
      reset({
        receiptId: installationReceiptId ?? initialData?.receiptId ?? '',
        amount: initialData?.amount ?? 0,
        paymentDate: initialData?.paymentDate ?? new Date(),
        notes: initialData?.notes ?? '',
        autoGenerateReceipt: false,
      });
    }
  }, [open, initialData, installationReceiptId, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
      <DialogContent>
        {!isEdit && hasInstallationReceipt && (
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            This payment will be recorded against the installation receipt{' '}
            <strong>{installationReceiptId}</strong>.
          </Alert>
        )}

        {!isEdit && !hasInstallationReceipt && (
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            No receipt exists for this installation yet. Enter the receipt ID to use for all
            payments on this installation.
          </Alert>
        )}

        <Controller
          name="receiptId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Receipt ID"
              margin="normal"
              required
              InputProps={{ readOnly: lockReceipt || isEdit }}
              error={!!errors.receiptId || receiptUsedElsewhere === true}
              helperText={
                errors.receiptId?.message ??
                (receiptUsedElsewhere === true
                  ? 'Receipt ID is already used on another installation'
                  : lockReceipt
                    ? 'Same receipt as previous payments on this installation'
                    : undefined)
              }
            />
          )}
        />

        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <TextField
              fullWidth
              label="Amount"
              margin="normal"
              placeholder="e.g. 5000 or 5,000"
              inputMode="decimal"
              error={!!errors.amount}
              helperText={
                errors.amount?.message ??
                (maxAmount !== undefined ? `Maximum pending: ${maxAmount}` : undefined)
              }
              value={formatAmountInput(field.value, { emptyWhenZero: true })}
              onChange={(e) => field.onChange(parseAmountInput(e.target.value))}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
            />
          )}
        />

        <Controller
          name="paymentDate"
          control={control}
          render={({ field }) => (
            <TextField
              type="date"
              fullWidth
              label="Payment Date"
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={formatDateInput(field.value)}
              onChange={(e) => field.onChange(new Date(e.target.value))}
              error={!!errors.paymentDate}
              helperText={errors.paymentDate?.message}
            />
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <TextField {...field} fullWidth label="Notes (Optional)" margin="normal" multiline rows={2} />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={loading || receiptUsedElsewhere === true}
        >
          {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
