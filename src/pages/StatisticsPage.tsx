import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useInstallations } from '@/hooks/useInstallations';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { StatCard } from '@/components/common/StatCard';
import { StatisticsCharts } from '@/features/statistics/StatisticsCharts';
import { REGIONS, REGION_NAMES, DEVICE_TYPES, DEVICE_TYPE_LABELS } from '@/constants';
import {
  filterInstallations,
  getInstallationsByRegion,
  getInstallationsByDepo,
  getInstallationsPerDay,
  computeFilteredStatsSummary,
  getDepoOptions,
  computeRegionReport,
  computeDepoReport,
} from '@/services/statsService';
import { exportToCsv, exportToExcel } from '@/services/exportService';
import { formatCurrency, parseInputDate } from '@/utils';
import type { InstallationFilters, DeviceType } from '@/types';
import DevicesIcon from '@mui/icons-material/Devices';
import PaidIcon from '@mui/icons-material/Paid';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

const ALL_REGIONS = 'ALL';
const ALL_DEPOS = 'ALL';
const ALL_DEVICE_TYPES = 'ALL';

export function StatisticsPage() {
  const { data: installations = [], isLoading } = useInstallations();
  const [region, setRegion] = useState(ALL_REGIONS);
  const [depo, setDepo] = useState(ALL_DEPOS);
  const [deviceType, setDeviceType] = useState(ALL_DEVICE_TYPES);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo<InstallationFilters>(
    () => ({
      region: region === ALL_REGIONS ? '' : region,
      depo: region !== ALL_REGIONS && depo !== ALL_DEPOS ? depo : '',
      deviceType: deviceType === ALL_DEVICE_TYPES ? '' : (deviceType as DeviceType),
      installationDateFrom: dateFrom ? parseInputDate(dateFrom) : null,
      installationDateTo: dateTo ? parseInputDate(dateTo) : null,
    }),
    [region, depo, deviceType, dateFrom, dateTo],
  );

  const filtered = useMemo(
    () => filterInstallations(installations, filters),
    [installations, filters],
  );

  const depoOptions = useMemo(() => {
    if (region === ALL_REGIONS) return [];
    const options = getDepoOptions(installations, region, REGIONS[region] ?? []);
    if (depo !== ALL_DEPOS && !options.includes(depo)) {
      return [...options, depo].sort();
    }
    return options;
  }, [installations, region, depo]);

  const summary = useMemo(() => computeFilteredStatsSummary(filtered), [filtered]);

  const distributionData = useMemo(() => {
    try {
      if (region === ALL_REGIONS) {
        return getInstallationsByRegion(filtered);
      }
      return getInstallationsByDepo(filtered, region);
    } catch {
      return [];
    }
  }, [filtered, region]);

  const dailyData = useMemo(() => {
    try {
      return getInstallationsPerDay(filtered);
    } catch {
      return [];
    }
  }, [filtered]);

  const distributionTitle =
    region === ALL_REGIONS
      ? 'Installations by Region'
      : depo === ALL_DEPOS
        ? `Installations by Depo — ${region}`
        : `Installations — ${depo}, ${region}`;

  const dailyTitle =
    region === ALL_REGIONS
      ? 'Installations per Day (Hygrometer / Solar / Tradomation)'
      : depo === ALL_DEPOS
        ? `Installations per Day — ${region}`
        : `Installations per Day — ${depo}`;

  const dailyPeak = useMemo(
    () => (dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.total)) : 0),
    [dailyData],
  );

  const handleRegionChange = (value: string) => {
    setRegion(value);
    setDepo(ALL_DEPOS);
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const data =
      region === ALL_REGIONS
        ? computeRegionReport(filtered).map((row) => ({ ...row }))
        : computeDepoReport(filtered).map((row) => ({ ...row }));

    const scope =
      region === ALL_REGIONS
        ? 'all-regions'
        : depo === ALL_DEPOS
          ? region.toLowerCase().replace(/\s+/g, '-')
          : `${region}-${depo}`.toLowerCase().replace(/\s+/g, '-');

    const fileName = `statistics-${scope}-${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') exportToExcel(data as Record<string, unknown>[], 'Statistics', fileName);
    else exportToCsv(data as Record<string, unknown>[], fileName);
  };

  const clearFilters = () => {
    setRegion(ALL_REGIONS);
    setDepo(ALL_DEPOS);
    setDeviceType(ALL_DEVICE_TYPES);
    setDateFrom('');
    setDateTo('');
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Statistics & Reports
        </Typography>
        <Box display="flex" gap={1}>
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => handleExport('excel')}>
            Export Excel
          </Button>
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Region"
              size="small"
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <MenuItem value={ALL_REGIONS}>All Regions</MenuItem>
              {REGION_NAMES.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Depo"
              size="small"
              value={depo}
              onChange={(e) => setDepo(e.target.value)}
              disabled={region === ALL_REGIONS}
            >
              <MenuItem value={ALL_DEPOS}>All Depos</MenuItem>
              {depoOptions.map((name) => (
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
              label="Device Type"
              size="small"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
            >
              <MenuItem value={ALL_DEVICE_TYPES}>All Types</MenuItem>
              {DEVICE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {DEVICE_TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="From Date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="To Date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button fullWidth variant="text" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }}
        gap={2}
        mb={3}
      >
        <StatCard
          title="Installations"
          value={summary.totalInstallations}
          subtitle={`${summary.totalHygrometers} Hygro · ${summary.totalHygrometersWithSolar} Solar · ${summary.totalTradomation} Tradomation`}
          icon={<DevicesIcon />}
        />
        <StatCard
          title="Contract Value"
          value={formatCurrency(summary.totalContractValue)}
          subtitle={`Collected: ${formatCurrency(summary.amountCollected)}`}
          icon={<PaidIcon />}
          color="secondary.main"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(summary.amountPending)}
          subtitle={`${summary.collectionPercentage.toFixed(1)}% collected`}
          icon={<PendingActionsIcon />}
          color="warning.main"
        />
        <StatCard
          title="Daily Peak"
          value={dailyPeak}
          subtitle="Max installations in a single day"
          icon={<DevicesIcon />}
          color="info.main"
        />
      </Box>

      <StatisticsCharts
        distributionData={distributionData}
        distributionTitle={distributionTitle}
        dailyData={dailyData}
        dailyTitle={dailyTitle}
      />
    </Box>
  );
}
