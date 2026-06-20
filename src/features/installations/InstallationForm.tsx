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
import { formatCurrency, formatDateInput } from '@/utils';
import { emptyFieldHighlightSx, isEmptyFormValue } from '@/utils/formFieldStyles';

function formatAmountFieldValue(value: number, emptyWhenZero: boolean): string | number {
  if (emptyWhenZero && value === 0) return '';
  return value;
}

function parseAmountFieldValue(raw: string): number {
  if (raw === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
  totalAmount: yup
    .number()
    .typeError('Total amount is required')
    .moreThan(0, 'Total amount must be greater than 0')
    .required('Total amount is required'),
  followupDate: yup.date().nullable().optional(),
  receiptId: yup.string().optional(),
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
    receiptId: isCreate
      ? yup.string().trim().required('Receipt ID is required')
      : yup.string().optional(),
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
      totalAmount: initialData?.totalAmount ?? (isCreate ? createPricing.totalAmount : 0),
      followupDate: initialData?.followupDate ?? null,
      receiptId: '',
      paidAmount: isCreate ? createPricing.defaultPaidAmount : 0,
    },
  });

  const values = watch();
  const selectedRegion = values.region;
  const deviceType = values.deviceType;
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
    setValue('totalAmount', pricing.totalAmount);
    setValue('paidAmount', pricing.defaultPaidAmount);
  }, [deviceType, isCreate, setValue]);

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
          {isCreate && (
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
                    error={!!errors.receiptId}
                    helperText={
                      errors.receiptId?.message ??
                      'From your receipt book — later payments use the same ID'
                    }
                    sx={highlight('receiptId', field.value)}
                  />
                )}
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <Controller
              name="totalAmount"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  fullWidth
                  label="Total Amount"
                  required
                  placeholder="Enter total amount"
                  error={!!errors.totalAmount}
                  helperText={errors.totalAmount?.message}
                  value={formatAmountFieldValue(field.value, isCreate)}
                  onChange={(e) => field.onChange(parseAmountFieldValue(e.target.value))}
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
                      type="number"
                      fullWidth
                      label="Amount Paid"
                      placeholder="0"
                      error={!!errors.paidAmount}
                      helperText={errors.paidAmount?.message}
                      value={formatAmountFieldValue(field.value ?? 0, true)}
                      onChange={(e) => field.onChange(parseAmountFieldValue(e.target.value))}
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
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Saving...' : initialData ? 'Update Installation' : 'Create Installation'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
