import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { EXPENSE_SUBTYPES, EXPENSE_TYPES, REGIONS, REGION_NAMES } from '@/constants';
import type { ExpenseFilters, ExpenseType } from '@/types';
import { formatDateInput, parseInputDate } from '@/utils';

interface Props {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

function subtypeOptionsForType(type: ExpenseType | '' | undefined) {
  if (type && type in EXPENSE_SUBTYPES) {
    return EXPENSE_SUBTYPES[type as keyof typeof EXPENSE_SUBTYPES];
  }
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  for (const list of Object.values(EXPENSE_SUBTYPES)) {
    for (const item of list) {
      if (seen.has(item.value)) continue;
      seen.add(item.value);
      options.push(item);
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function ExpenseFiltersPanel({ filters, onChange }: Props) {
  const update = (partial: Partial<ExpenseFilters>) => onChange({ ...filters, ...partial });
  const subtypes = subtypeOptionsForType(filters.type);
  const depoOptions = filters.region ? (REGIONS[filters.region] ?? []) : [];
  const typeHasSubtypes = Boolean(filters.type && filters.type in EXPENSE_SUBTYPES);
  const subtypeDisabled = Boolean(filters.type) && !typeHasSubtypes;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Filters
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            type="date"
            fullWidth
            size="small"
            label="Date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={formatDateInput(filters.date)}
            onChange={(event) =>
              update({
                date: event.target.value ? parseInputDate(event.target.value) : null,
                dateFrom: null,
                dateTo: null,
                month: '',
              })
            }
            helperText="Show expenses for this day"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            type="date"
            fullWidth
            size="small"
            label="From"
            slotProps={{ inputLabel: { shrink: true } }}
            value={formatDateInput(filters.dateFrom)}
            onChange={(event) =>
              update({
                dateFrom: event.target.value ? parseInputDate(event.target.value) : null,
                date: null,
              })
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            type="date"
            fullWidth
            size="small"
            label="To"
            slotProps={{ inputLabel: { shrink: true } }}
            value={formatDateInput(filters.dateTo)}
            onChange={(event) =>
              update({
                dateTo: event.target.value ? parseInputDate(event.target.value) : null,
                date: null,
              })
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            type="month"
            fullWidth
            size="small"
            label="Month"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.month ?? ''}
            onChange={(event) =>
              update({
                month: event.target.value,
                date: null,
              })
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            size="small"
            label="Expense type"
            value={filters.type ?? ''}
            onChange={(event) => {
              const nextType = event.target.value as ExpenseFilters['type'];
              update({ type: nextType, subtype: '' });
            }}
          >
            <MenuItem value="">All types</MenuItem>
            {EXPENSE_TYPES.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            size="small"
            label="Subtype"
            value={filters.subtype ?? ''}
            disabled={subtypeDisabled}
            onChange={(event) =>
              update({ subtype: event.target.value as ExpenseFilters['subtype'] })
            }
          >
            <MenuItem value="">All subtypes</MenuItem>
            {subtypes.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            size="small"
            label="Region"
            value={filters.region ?? ''}
            onChange={(event) => update({ region: event.target.value, depo: '' })}
          >
            <MenuItem value="">All regions</MenuItem>
            {REGION_NAMES.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            size="small"
            label="Depo"
            value={filters.depo ?? ''}
            disabled={!filters.region}
            onChange={(event) => update({ depo: event.target.value })}
          >
            <MenuItem value="">All depos</MenuItem>
            {depoOptions.map((depo) => (
              <MenuItem key={depo} value={depo}>
                {depo}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={1}>
          <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
            <Button
              onClick={() =>
                onChange({
                  dateFrom: null,
                  dateTo: null,
                  date: null,
                  type: '',
                  subtype: '',
                  region: '',
                  depo: '',
                  month: '',
                })
              }
            >
              Clear
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
