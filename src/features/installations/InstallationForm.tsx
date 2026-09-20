import { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Grid,
  TextField,
  MenuItem,
  Button,
  Paper,
  Typography,
  Box,
  Autocomplete,
  Divider,
  Alert,
} from '@mui/material';
import { REGIONS, REGION_NAMES, DEVICE_TYPES, DEVICE_TYPE_LABELS, DEVICE_PRICING } from '@/constants';
import type { DeviceType, InstallationFormData, InstallationWithCalculations } from '@/types';
import { formatAmountInput, formatCurrency, formatDateInput, parseAmountInput } from '@/utils';
import { emptyFieldHighlightSx, isEmptyFormValue } from '@/utils/formFieldStyles';
import { useCheckReceiptId, useCheckReceiptIdUsedElsewhere } from '@/hooks/useInstallations';

const baseSchema = yup.object({
  deviceType: yup.string().oneOf(DEVICE_TYPES).required('Device type is required'),
  deviceId: yup.string().optional(),
  farmerName: yup.string().required('Farmer name is required'),
  farmerNumber: yup.string().required('Farmer number is required'),
  farmerCNIC: yup.string().required('CNIC is required'),
  region: yup.string().required('Region is required'),
  depo: yup.string().optional(),
  location: yup.string().optional(),
  sedRepresentative: yup.string().required('SED representative is required'),
  ptcRepresentative: yup.string().optional(),
  installationDate: yup.date().required('Installation date is required'),
  deviceQuantity: yup
    .number()
    .typeError('Device quantity is required')
    .integer('Device quantity must be a whole number')
    .min(1, 'At least 1 device')
    .required('Device quantity is required'),
  totalAmount: yup
    .number()
    .typeError('Total amount is required')
    .moreThan(0, 'Total amount must be greater than 0')
    .required('Total amount is required'),
  followupDate: yup.date().nullable().optional(),
  receiptId: yup.string().trim().required('Receipt ID is required'),
  paidAmount: yup.number().min(0, 'Paid amount cannot be negative').optional(),
});

function createSchema(isCreate: boolean) {
  return baseSchema.shape({
    followupDate: yup
      .date()
      .nullable()
      .test(
        'followup-required',
        'Follow-up date is required when no initial payment is made',
        function (value) {
          if (!isCreate) return true;
          const { paidAmount } = this.parent as InstallationFormData;
          if ((paidAmount ?? 0) > 0) return true;
          return !!value;
        },
      ),
    paidAmount: yup
      .number()
      .min(0)
      .optional()
      .test('paid-not-over-total', 'Paid amount cannot exceed total amount', function (value) {
        const { totalAmount } = this.parent as InstallationFormData;
        return (value ?? 0) <= totalAmount;
      }),
  });
}

function getInitialReceiptId(initialData?: InstallationWithCalculations): string {
  return (
    initialData?.latestReceiptId?.trim() ||
    initialData?.receiptIds.find((id) => id.trim())?.trim() ||
    ''
  );
}

function scrollToFirstError(formErrors: FieldErrors<InstallationFormData>) {
  const firstField = Object.keys(formErrors)[0];
  if (!firstField) return;

  const element =
    document.querySelector(`[name="${firstField}"]`) ??
    document.querySelector(`[data-field="${firstField}"]`);

  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

interface Props {
  initialData?: InstallationWithCalculations;
  amountReceived?: number;
  onSubmit: (data: InstallationFormData) => Promise<void>;
  loading?: boolean;
  highlightEmpty?: boolean;
}

export function InstallationForm({
  initialData,
  amountReceived = 0,
  onSubmit,
  loading,
  highlightEmpty = false,
}: Props) {
  const isCreate = !initialData;
  const schema = useMemo(() => createSchema(isCreate), [isCreate]);
  const previousRegion = useRef<string | undefined>(initialData?.region);
  const defaultDeviceType: DeviceType = initialData?.deviceType ?? 'HYGROMETER';
  const createPricing = DEVICE_PRICING[defaultDeviceType];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstallationFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      deviceType: defaultDeviceType,
      deviceId: initialData?.deviceId ?? '',
      farmerName: initialData?.farmerName ?? '',
      farmerNumber: initialData?.farmerNumber ?? '',
      farmerCNIC: initialData?.farmerCNIC ?? '',
      region: initialData?.region ?? '',
      depo: initialData?.depo ?? '',
      location: initialData?.location ?? '',
      sedRepresentative: initialData?.sedRepresentative ?? '',
      ptcRepresentative: initialData?.ptcRepresentative ?? '',
      installationDate: initialData?.installationDate ?? new Date(),
      deviceQuantity: initialData?.deviceQuantity ?? 1,
      totalAmount: initialData?.totalAmount ?? (isCreate ? createPricing.totalAmount : 0),
      followupDate: initialData?.followupDate ?? null,
      receiptId: getInitialReceiptId(initialData),
      paidAmount: isCreate ? createPricing.defaultPaidAmount : 0,
    },
  });

  const values = watch();
  const receiptIdValue = values.receiptId ?? '';
  const { data: receiptExists } = useCheckReceiptId(
    receiptIdValue,
    isCreate && receiptIdValue.trim().length > 0,
  );
  const { data: receiptUsedElsewhere } = useCheckReceiptIdUsedElsewhere(
    initialData?.id ?? '',
    receiptIdValue,
    !isCreate && receiptIdValue.trim().length > 0,
  );
  const receiptDuplicate = isCreate ? receiptExists === true : receiptUsedElsewhere === true;

  const selectedRegion = values.region;
  const deviceType = values.deviceType;
  const deviceQuantity = values.deviceQuantity ?? 1;
  const totalAmount = values.totalAmount;
  const paidAmount = values.paidAmount ?? 0;
  const followupRequired = isCreate && paidAmount === 0;
  const outstandingBalance = Math.max(
    0,
    totalAmount - amountReceived - (isCreate ? paidAmount : 0),
  );
  const depos = selectedRegion ? (REGIONS[selectedRegion] ?? []) : [];

  const highlight = (fieldName: keyof InstallationFormData, value: unknown) =>
    emptyFieldHighlightSx(highlightEmpty, isEmptyFormValue(value), !!errors[fieldName]);

  useEffect(() => {
    if (
      previousRegion.current &&
      selectedRegion &&
      previousRegion.current !== selectedRegion
    ) {
      setValue('depo', '');
    }
    previousRegion.current = selectedRegion;
  }, [selectedRegion, setValue]);

  useEffect(() => {
    if (!isCreate) return;
    const pricing = DEVICE_PRICING[deviceType];
    const qty = Math.max(1, Math.round(Number(deviceQuantity) || 1));
    setValue('totalAmount', pricing.totalAmount * qty);
    setValue('paidAmount', pricing.defaultPaidAmount * qty);
  }, [deviceType, deviceQuantity, isCreate, setValue]);

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
      {highlightEmpty && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Required fields left empty are highlighted in amber. Fill them before saving.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit, scrollToFirstError)}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Farmer & Device
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="deviceType"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Device Type"
                  error={!!errors.deviceType}
                  helperText={errors.deviceType?.message}
                >
                  {DEVICE_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {DEVICE_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="deviceQuantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label="Device Quantity"
                  required
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  error={!!errors.deviceQuantity}
                  helperText={
                    errors.deviceQuantity?.message ??
                    (isCreate
                      ? 'Devices on this receipt. Total defaults to unit price × quantity.'
                      : 'Devices installed on this receipt')
                  }
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="deviceId"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Device ID (Optional)" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="farmerName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Farmer Name"
                  required
                  error={!!errors.farmerName}
                  helperText={errors.farmerName?.message}
                  sx={highlight('farmerName', field.value)}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="farmerNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Farmer Number"
                  required
                  error={!!errors.farmerNumber}
                  helperText={errors.farmerNumber?.message}
                  sx={highlight('farmerNumber', field.value)}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="farmerCNIC"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Farmer CNIC"
                  required
                  error={!!errors.farmerCNIC}
                  helperText={errors.farmerCNIC?.message}
                  sx={highlight('farmerCNIC', field.value)}
                />
              )}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Location & Representatives
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="region"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Region"
                  required
                  error={!!errors.region}
                  helperText={errors.region?.message}
                  sx={highlight('region', field.value)}
                >
                  {REGION_NAMES.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="depo"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={depos}
                  value={field.value ?? ''}
                  onChange={(_, value) => field.onChange(value ?? '')}
                  onInputChange={(_, value) => field.onChange(value)}
                  disabled={!selectedRegion}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      name="depo"
                      label="Depo"
                      error={!!errors.depo}
                      helperText={errors.depo?.message ?? 'Type freely or pick from suggestions'}
                    />
                  )}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Location (Optional)" />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="sedRepresentative"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="SED Representative"
                  required
                  error={!!errors.sedRepresentative}
                  helperText={errors.sedRepresentative?.message}
                  sx={highlight('sedRepresentative', field.value)}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="ptcRepresentative"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="PTC Representative (Optional)"
                  error={!!errors.ptcRepresentative}
                  helperText={errors.ptcRepresentative?.message}
                />
              )}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={700} mb={2}>
          Payment & Dates
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="installationDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="date"
                  fullWidth
                  label="Installation Date"
                  InputLabelProps={{ shrink: true }}
                  value={formatDateInput(field.value)}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  error={!!errors.installationDate}
                  helperText={errors.installationDate?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="receiptId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Receipt ID"
                  placeholder="Enter receipt number from book"
                  required
                  error={!!errors.receiptId || receiptDuplicate}
                  helperText={
                    errors.receiptId?.message ??
                    (receiptDuplicate
                      ? isCreate
                        ? 'Receipt ID already exists in the system'
                        : 'Receipt ID is already used on another installation'
                      : isCreate
                        ? 'From your receipt book — later payments use the same ID'
                        : 'Must be unique. Changing this updates all payments on this installation')
                  }
                  sx={highlight('receiptId', field.value)}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="totalAmount"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label="Total Amount"
                  required
                  placeholder="e.g. 12500 or 12,500"
                  inputMode="decimal"
                  error={!!errors.totalAmount}
                  helperText={
                    errors.totalAmount?.message ??
                    (isCreate
                      ? `Default ${formatCurrency(DEVICE_PRICING[deviceType].totalAmount)} × ${deviceQuantity}. Edit for concessions.`
                      : undefined)
                  }
                  value={formatAmountInput(field.value, { emptyWhenZero: isCreate })}
                  onChange={(e) => field.onChange(parseAmountInput(e.target.value))}
                  onBlur={field.onBlur}
                  name={field.name}
                  inputRef={field.ref}
                  sx={highlight('totalAmount', isCreate && field.value === 0 ? '' : field.value)}
                />
              )}
            />
          </Grid>

          {isCreate && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" mt={1}>
                  Initial Payment
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Default advance is prefilled from device pricing. Edit if a concession applies.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="paidAmount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      label="Amount Paid"
                      placeholder="e.g. 5000 or 5,000"
                      inputMode="decimal"
                      error={!!errors.paidAmount}
                      helperText={errors.paidAmount?.message}
                      value={formatAmountInput(field.value ?? 0, { emptyWhenZero: true })}
                      onChange={(e) => field.onChange(parseAmountInput(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      inputRef={field.ref}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
                  Remaining after payment: {formatCurrency(outstandingBalance)}
                </Typography>
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6}>
            <Controller
              name="followupDate"
              control={control}
              render={({ field }) => (
                <TextField
                  name="followupDate"
                  type="date"
                  fullWidth
                  label="Follow-up Date"
                  InputLabelProps={{ shrink: true }}
                  value={field.value ? formatDateInput(field.value) : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  error={!!errors.followupDate}
                  helperText={
                    errors.followupDate?.message ??
                    (followupRequired
                      ? 'Required when no initial payment is made'
                      : 'Optional when an advance payment is recorded')
                  }
                  required={followupRequired}
                  sx={
                    followupRequired
                      ? highlight('followupDate', field.value)
                      : undefined
                  }
                />
              )}
            />
          </Grid>
        </Grid>

        <Box mt={3} display="flex" gap={2}>
          <Button type="submit" variant="contained" size="large" disabled={loading || receiptDuplicate}>
            {loading ? 'Saving...' : initialData ? 'Update Installation' : 'Create Installation'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
