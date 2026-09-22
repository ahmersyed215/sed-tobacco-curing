import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import type { AppUser, ExpenseInflow, ExpenseInflowFormData } from '@/types';
import { formatAmountInput, formatDateInput, parseAmountInput, parseInputDate } from '@/utils';

const schema = yup.object({
  walletManagerUid: yup.string().required('Manager wallet is required'),
  walletManagerName: yup.string().required(),
  amount: yup.number().moreThan(0, 'Amount must be greater than 0').required('Amount is required'),
  inflowDate: yup.date().required('Date is required'),
  note: yup.string().trim().required('Note / description is required'),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseInflowFormData) => Promise<void>;
  initialData?: ExpenseInflow;
  loading?: boolean;
  managers: AppUser[];
  lockWallet?: boolean;
  defaultWallet?: { uid: string; name: string };
}

export function ExpenseInflowFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading,
  managers,
  lockWallet = false,
  defaultWallet,
}: Props) {
  const isEdit = Boolean(initialData);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseInflowFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      walletManagerUid: '',
      walletManagerName: '',
      amount: 0,
      inflowDate: new Date(),
      note: '',
    },
  });

  const walletOptions = useMemo(() => {
    const list = [...managers];
    if (
      initialData?.walletManagerUid &&
      !list.some((manager) => manager.uid === initialData.walletManagerUid)
    ) {
      list.push({
        id: initialData.walletManagerUid,
        uid: initialData.walletManagerUid,
        email: '',
        name: initialData.walletManagerName,
        role: 'manager',
        permissions: {} as AppUser['permissions'],
        hasLogin: true,
        isDeleted: false,
        createdAt: new Date(),
        createdBy: '',
        updatedAt: new Date(),
        updatedBy: '',
      });
    }
    return list;
  }, [managers, initialData]);

  useEffect(() => {
    if (!open) return;
    reset({
      walletManagerUid: initialData?.walletManagerUid || defaultWallet?.uid || '',
      walletManagerName: initialData?.walletManagerName || defaultWallet?.name || '',
      amount: initialData?.amount ?? 0,
      inflowDate: initialData?.inflowDate ?? new Date(),
      note: initialData?.note ?? '',
    });
  }, [open, initialData, defaultWallet, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Reimbursement' : 'Add Reimbursement'}</DialogTitle>
      <DialogContent>
        <Controller
          name="walletManagerUid"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Manager wallet"
              margin="normal"
              disabled={lockWallet}
              error={!!errors.walletManagerUid}
              helperText={errors.walletManagerUid?.message}
              onChange={(event) => {
                const uid = event.target.value;
                const manager = walletOptions.find((item) => item.uid === uid);
                field.onChange(uid);
                setValue('walletManagerName', manager?.name || manager?.email || '');
              }}
            >
              {walletOptions.map((manager) => (
                <MenuItem key={manager.uid} value={manager.uid}>
                  {manager.name || manager.email}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="inflowDate"
          control={control}
          render={({ field }) => (
            <TextField
              type="date"
              fullWidth
              label="Date"
              margin="normal"
              slotProps={{ inputLabel: { shrink: true } }}
              value={formatDateInput(field.value)}
              onChange={(event) => field.onChange(parseInputDate(event.target.value))}
              error={!!errors.inflowDate}
              helperText={errors.inflowDate?.message}
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
              placeholder="e.g. 10000"
              inputMode="decimal"
              error={!!errors.amount}
              helperText={errors.amount?.message}
              value={formatAmountInput(field.value, { emptyWhenZero: true })}
              onChange={(event) => field.onChange(parseAmountInput(event.target.value))}
              onBlur={field.onBlur}
              name={field.name}
              inputRef={field.ref}
            />
          )}
        />
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Note / Description"
              margin="normal"
              multiline
              rows={2}
              error={!!errors.note}
              helperText={errors.note?.message}
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Reimbursement' : 'Add Reimbursement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
