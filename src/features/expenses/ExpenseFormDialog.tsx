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
import {
  EXPENSE_SUBTYPES,
  EXPENSE_TYPE_FIELDS,
  EXPENSE_TYPES,
  REGIONS,
  REGION_NAMES,
} from '@/constants';
import type { AppUser, Expense, ExpenseFormData, ExpenseType } from '@/types';
import { formatAmountInput, formatDateInput, parseAmountInput, parseInputDate } from '@/utils';

const schema = yup.object({
  type: yup
    .string()
    .oneOf(EXPENSE_TYPES.map((item) => item.value))
    .required('Expense type is required'),
  subtype: yup.string().when('type', {
    is: (type: string) => type in EXPENSE_SUBTYPES,
    then: (s) => s.required('Subtype is required'),
    otherwise: (s) => s.optional(),
  }),
  expenseDate: yup.date().required('Date is required'),
  amount: yup.number().moreThan(0, 'Amount must be greater than 0').required('Amount is required'),
  note: yup.string().trim().optional(),
  sedRepresentative: yup.string().when('type', {
    is: (type: ExpenseType) => EXPENSE_TYPE_FIELDS[type]?.includes('sedRepresentative'),
    then: (s) => s.trim().required('SED representative is required'),
    otherwise: (s) => s.optional(),
  }),
  region: yup.string().when(['type', 'subtype'], {
    is: (type: ExpenseType, subtype: string) =>
      EXPENSE_TYPE_FIELDS[type]?.includes('region') && !(type === 'FOOD' && subtype === 'OFFICE'),
    then: (s) => s.required('Region is required'),
    otherwise: (s) => s.optional(),
  }),
  depo: yup.string().when(['type', 'subtype'], {
    is: (type: ExpenseType, subtype: string) =>
      EXPENSE_TYPE_FIELDS[type]?.includes('depo') && !(type === 'FOOD' && subtype === 'OFFICE'),
    then: (s) => s.trim().required('Depo is required'),
    otherwise: (s) => s.optional(),
  }),
  walletManagerUid: yup.string().required('Manager wallet is required'),
  walletManagerName: yup.string().required(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  initialData?: Expense;
  loading?: boolean;
  managers: AppUser[];
  users: AppUser[];
  lockWallet?: boolean;
  defaultWallet?: { uid: string; name: string };
}

export function ExpenseFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading,
  managers,
  users,
  lockWallet = false,
  defaultWallet,
}: Props) {
  const isEdit = Boolean(initialData);
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      type: 'TRANSPORT',
      subtype: '',
      expenseDate: new Date(),
      amount: 0,
      note: '',
      sedRepresentative: '',
      region: '',
      depo: '',
      walletManagerUid: '',
      walletManagerName: '',
    },
  });

  const type = watch('type');
  const subtype = watch('subtype');
  const region = watch('region');
  const fields = EXPENSE_TYPE_FIELDS[type] ?? [];
  const subtypes = type in EXPENSE_SUBTYPES ? EXPENSE_SUBTYPES[type as keyof typeof EXPENSE_SUBTYPES] : [];
  const depoOptions = region ? (REGIONS[region] ?? []) : [];
  const showRegionDepo =
    fields.includes('region') && !(type === 'FOOD' && subtype === 'OFFICE');

  const sedOptions = useMemo(() => {
    const names = users
      .map((user) => user.name.trim() || user.email)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const current = initialData?.sedRepresentative?.trim();
    if (current && !names.includes(current)) {
      return [current, ...names];
    }
    return names;
  }, [users, initialData]);

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
      type: initialData?.type ?? 'TRANSPORT',
      subtype: initialData?.subtype ?? '',
      expenseDate: initialData?.expenseDate ?? new Date(),
      amount: initialData?.amount ?? 0,
      note: initialData?.note ?? '',
      sedRepresentative: initialData?.sedRepresentative ?? '',
      region: initialData?.region ?? '',
      depo: initialData?.depo ?? '',
      walletManagerUid: initialData?.walletManagerUid || defaultWallet?.uid || '',
      walletManagerName: initialData?.walletManagerName || defaultWallet?.name || '',
    });
  }, [open, initialData, defaultWallet, reset]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
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
          name="type"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              fullWidth
              label="Expense type"
              margin="normal"
              onChange={(event) => {
                const nextType = event.target.value as ExpenseType;
                field.onChange(nextType);
                setValue('subtype', '');
                if (!EXPENSE_TYPE_FIELDS[nextType].includes('sedRepresentative')) {
                  setValue('sedRepresentative', '');
                }
                if (!EXPENSE_TYPE_FIELDS[nextType].includes('region')) {
                  setValue('region', '');
                  setValue('depo', '');
                }
              }}
            >
              {EXPENSE_TYPES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        {fields.includes('subtype') && (
          <Controller
            name="subtype"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Subtype"
                margin="normal"
                error={!!errors.subtype}
                helperText={errors.subtype?.message}
                onChange={(event) => {
                  const nextSubtype = event.target.value;
                  field.onChange(nextSubtype);
                  if (type === 'FOOD' && nextSubtype === 'OFFICE') {
                    setValue('region', '');
                    setValue('depo', '');
                  }
                }}
              >
                {subtypes.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        {fields.includes('expenseDate') && (
          <Controller
            name="expenseDate"
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
                error={!!errors.expenseDate}
                helperText={errors.expenseDate?.message}
              />
            )}
          />
        )}

        {fields.includes('sedRepresentative') && (
          <Controller
            name="sedRepresentative"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="SED Representative"
                margin="normal"
                error={!!errors.sedRepresentative}
                helperText={errors.sedRepresentative?.message}
              >
                {sedOptions.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        {fields.includes('amount') && (
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <TextField
                fullWidth
                label="Amount"
                margin="normal"
                placeholder="e.g. 2500"
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
        )}

        {showRegionDepo && (
          <Controller
            name="region"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Region"
                margin="normal"
                error={!!errors.region}
                helperText={errors.region?.message}
                onChange={(event) => {
                  field.onChange(event.target.value);
                  setValue('depo', '');
                }}
              >
                {REGION_NAMES.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        {showRegionDepo && (
          <Controller
            name="depo"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Depo"
                margin="normal"
                disabled={!region}
                error={!!errors.depo}
                helperText={errors.depo?.message}
              >
                {depoOptions.map((depo) => (
                  <MenuItem key={depo} value={depo}>
                    {depo}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        {fields.includes('note') && (
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Note / Description (Optional)"
                margin="normal"
                multiline
                rows={2}
                error={!!errors.note}
                helperText={errors.note?.message}
              />
            )}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Add Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
