import {
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Box,
  Typography,
  Autocomplete,
} from '@mui/material';
import { REGIONS, REGION_NAMES, DEVICE_TYPES, DEVICE_TYPE_LABELS } from '@/constants';
import { getDepoOptions } from '@/services/statsService';
import { formatDateInput, parseInputDate } from '@/utils';
import type { InstallationFilters, InstallationWithCalculations } from '@/types';

interface Props {
  filters: InstallationFilters;
  onChange: (filters: InstallationFilters) => void;
  installations: InstallationWithCalculations[];
}

export function InstallationFiltersPanel({ filters, onChange, installations }: Props) {
  const sedReps = [...new Set(installations.map((i) => i.sedRepresentative).filter(Boolean))].sort();
  const ptcReps = [...new Set(installations.map((i) => i.ptcRepresentative).filter(Boolean))].sort();

  const depoOptions = filters.region
    ? getDepoOptions(installations, filters.region, REGIONS[filters.region] ?? [])
    : [...new Set(installations.map((i) => i.depo?.trim()).filter(Boolean))].sort();

  const update = (partial: Partial<InstallationFilters>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Filters & Search
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Search"
            placeholder="Farmer name, CNIC, phone, device ID..."
            value={filters.search ?? ''}
            onChange={(e) => update({ search: e.target.value })}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            label="Receipt ID"
            placeholder="Filter by receipt ID"
            value={filters.receiptId ?? ''}
            onChange={(e) => update({ receiptId: e.target.value })}
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            select
            label="Region"
            value={filters.region ?? ''}
            onChange={(e) => update({ region: e.target.value, depo: '' })}
            size="small"
          >
            <MenuItem value="">All Regions</MenuItem>
            {REGION_NAMES.map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            freeSolo
            options={depoOptions}
            value={filters.depo ?? ''}
            onChange={(_, value) => update({ depo: value ?? '' })}
            onInputChange={(_, value) => update({ depo: value })}
            renderInput={(params) => (
              <TextField {...params} label="Depo" placeholder="All depos" size="small" />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            select
            label="Device Type"
            value={filters.deviceType ?? ''}
            onChange={(e) => update({ deviceType: e.target.value as InstallationFilters['deviceType'] })}
            size="small"
          >
            <MenuItem value="">All Types</MenuItem>
            {DEVICE_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {DEVICE_TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            select
            label="SED Representative"
            value={filters.sedRepresentative ?? ''}
            onChange={(e) => update({ sedRepresentative: e.target.value })}
            size="small"
          >
            <MenuItem value="">All SED Reps</MenuItem>
            {sedReps.map((rep) => (
              <MenuItem key={rep} value={rep}>
                {rep}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            select
            label="PTC Representative"
            value={filters.ptcRepresentative ?? ''}
            onChange={(e) => update({ ptcRepresentative: e.target.value })}
            size="small"
          >
            <MenuItem value="">All PTC Reps</MenuItem>
            {ptcReps.map((rep) => (
              <MenuItem key={rep} value={rep}>
                {rep}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            type="date"
            label="Installation From"
            InputLabelProps={{ shrink: true }}
            value={formatDateInput(filters.installationDateFrom)}
            onChange={(e) =>
              update({ installationDateFrom: e.target.value ? parseInputDate(e.target.value) : null })
            }
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            type="date"
            label="Installation To"
            InputLabelProps={{ shrink: true }}
            value={formatDateInput(filters.installationDateTo)}
            onChange={(e) =>
              update({ installationDateTo: e.target.value ? parseInputDate(e.target.value) : null })
            }
            size="small"
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.pendingPaymentsOnly ?? false}
                  onChange={(e) =>
                    update({
                      pendingPaymentsOnly: e.target.checked,
                      fullyPaidOnly: e.target.checked ? false : filters.fullyPaidOnly,
                    })
                  }
                />
              }
              label="Pending Payments"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.fullyPaidOnly ?? false}
                  onChange={(e) =>
                    update({
                      fullyPaidOnly: e.target.checked,
                      pendingPaymentsOnly: e.target.checked ? false : filters.pendingPaymentsOnly,
                    })
                  }
                />
              }
              label="Fully Paid"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.followupDueOnly ?? false}
                  onChange={(e) => update({ followupDueOnly: e.target.checked })}
                />
              }
              label="Followup Due"
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() =>
              onChange({
                region: '',
                depo: '',
                deviceType: '',
                sedRepresentative: '',
                ptcRepresentative: '',
                installationDateFrom: null,
                installationDateTo: null,
                pendingPaymentsOnly: false,
                fullyPaidOnly: false,
                followupDueOnly: false,
                search: '',
                receiptId: '',
              })
            }
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
