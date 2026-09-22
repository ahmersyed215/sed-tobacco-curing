import { useMemo } from 'react';
import {
  Grid,
  Typography,
  Paper,
  Box,
  LinearProgress,
  Chip,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import PaidIcon from '@mui/icons-material/Paid';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SensorsIcon from '@mui/icons-material/Sensors';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import TodayIcon from '@mui/icons-material/Today';
import HistoryIcon from '@mui/icons-material/History';
import { useInstallations, useAllPayments } from '@/hooks/useInstallations';
import { useAccess } from '@/hooks/useAdmin';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { StatCard } from '@/components/common/StatCard';
import { addCalendarDays, formatCurrency } from '@/utils';
import {
  computeDashboardStats,
  getUrgentFollowups,
  summarizeInstallationsOnDate,
} from '@/services/statsService';
import { DashboardCharts } from '@/features/dashboard/DashboardCharts';
import { AdminDangerZone } from '@/features/admin/AdminDangerZone';
import { DailyInstallationsCard } from '@/features/dashboard/DailyInstallationsCard';
import { FollowupAlertsDialog } from '@/features/dashboard/FollowupAlertsDialog';

function PaymentStatusCard({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const theme = useTheme();
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        flex: 1,
        minWidth: 180,
        borderRadius: 3,
        bgcolor: alpha(color, 0.08),
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        <Chip size="small" label={count} sx={{ bgcolor: alpha(color, 0.15), fontWeight: 700 }} />
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(theme.palette.divider, 0.4),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
      <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
        {pct.toFixed(1)}% of installations
      </Typography>
    </Paper>
  );
}

function DeviceMixCard({
  hygrometer,
  hygrometerWithSolar,
  tradomation,
  total,
}: {
  hygrometer: number;
  hygrometerWithSolar: number;
  tradomation: number;
  total: number;
}) {
  const theme = useTheme();
  const hygroPct = total > 0 ? (hygrometer / total) * 100 : 0;
  const solarPct = total > 0 ? (hygrometerWithSolar / total) * 100 : 0;
  const tradoPct = total > 0 ? (tradomation / total) * 100 : 0;

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
      }}
    >
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Device Mix
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2.5}>
        Installed device breakdown
      </Typography>

      <Stack spacing={2}>
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box display="flex" alignItems="center" gap={1}>
              <SensorsIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight={600}>
                Hygrometer
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700}>
              {hygrometer}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={hygroPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                bgcolor: theme.palette.primary.main,
              },
            }}
          />
        </Box>

        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box display="flex" alignItems="center" gap={1}>
              <SensorsIcon fontSize="small" color="info" />
              <Typography variant="body2" fontWeight={600}>
                Hygrometer with Solar
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700}>
              {hygrometerWithSolar}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={solarPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(theme.palette.info.main, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                bgcolor: theme.palette.info.main,
              },
            }}
          />
        </Box>

        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
            <Box display="flex" alignItems="center" gap={1}>
              <PrecisionManufacturingIcon fontSize="small" color="secondary" />
              <Typography variant="body2" fontWeight={600}>
                Tradomation
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700}>
              {tradomation}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={tradoPct}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: alpha(theme.palette.secondary.main, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                bgcolor: theme.palette.secondary.main,
              },
            }}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const { isSuperAdmin } = useAccess();
  const { data: installations = [], isLoading: loadingInstallations } = useInstallations();
  const { data: payments = [], isLoading: loadingPayments } = useAllPayments();

  const stats = useMemo(
    () => computeDashboardStats(installations, payments),
    [installations, payments],
  );

  const urgentFollowups = useMemo(() => getUrgentFollowups(installations), [installations]);

  const todaySummary = useMemo(() => summarizeInstallationsOnDate(installations, new Date()), [installations]);

  const yesterdaySummary = useMemo(
    () => summarizeInstallationsOnDate(installations, addCalendarDays(new Date(), -1)),
    [installations],
  );

  const collectionRate =
    stats.totalContractValue > 0
      ? (stats.totalAmountCollected / stats.totalContractValue) * 100
      : 0;

  if (loadingInstallations || loadingPayments) return <LoadingScreen />;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      <Paper
        sx={{
          p: { xs: 2.5, md: 4 },
          mb: 3,
          borderRadius: 4,
          color: 'common.white',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
          boxShadow: '0 20px 50px rgba(27, 94, 32, 0.22)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.08),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 80,
            bottom: -60,
            width: 140,
            height: 140,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.06),
          }}
        />
        <Box position="relative">
          <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 1.4 }}>
            SED Tobacco Curing
          </Typography>
          <Typography variant="h3" fontWeight={700} mt={0.5} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Dashboard
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.92, mt: 1, maxWidth: 560 }}>
            Real-time overview of installations, collections, and follow-ups.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} mt={2.5}>
            <Chip
              icon={<DevicesIcon />}
              label={`${stats.totalInstallations} installations`}
              sx={{ bgcolor: alpha('#fff', 0.16), color: 'inherit', fontWeight: 600 }}
            />
            <Chip
              icon={<TrendingUpIcon />}
              label={`${collectionRate.toFixed(1)}% collected`}
              sx={{ bgcolor: alpha('#fff', 0.16), color: 'inherit', fontWeight: 600 }}
            />
            <Chip
              label={`${stats.followupsDueToday} followups due today`}
              sx={{ bgcolor: alpha('#fff', 0.16), color: 'inherit', fontWeight: 600 }}
            />
          </Stack>
        </Box>
      </Paper>

      <FollowupAlertsDialog followups={urgentFollowups} />

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={6}>
          <DailyInstallationsCard
            title="Today's Installations"
            summary={todaySummary}
            icon={<TodayIcon />}
            accent={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DailyInstallationsCard
            title="Yesterday's Installations"
            summary={yesterdaySummary}
            icon={<HistoryIcon />}
            accent={theme.palette.secondary.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Total Installations"
            value={stats.totalInstallations}
            subtitle={`${stats.totalHygrometers} Hygro · ${stats.totalHygrometersWithSolar} Solar · ${stats.totalTradomation} Tradomation`}
            icon={<DevicesIcon />}
            accent={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Contract Value"
            value={formatCurrency(stats.totalContractValue)}
            subtitle={`Collected: ${formatCurrency(stats.totalAmountCollected)}`}
            icon={<PaidIcon />}
            color="secondary.main"
            accent={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Pending Amount"
            value={formatCurrency(stats.totalAmountPending)}
            subtitle={`${stats.pendingFollowups} outstanding followups`}
            icon={<PendingActionsIcon />}
            color="warning.main"
            accent={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <StatCard
            title="Receipts Issued"
            value={stats.totalReceiptsIssued}
            subtitle={`${stats.followupsDueToday} due today`}
            icon={<ReceiptIcon />}
            color="info.main"
            accent={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} lg={8}>
          <Paper
            sx={{
              p: { xs: 2.5, md: 3 },
              height: '100%',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
              background: `linear-gradient(160deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Collection Performance
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {formatCurrency(stats.totalAmountCollected)} collected of{' '}
              {formatCurrency(stats.totalContractValue)} total contract value
            </Typography>
            <Box display="flex" alignItems="baseline" gap={1} mb={1.5}>
              <Typography variant="h2" fontWeight={700} color="primary.main" sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
                {collectionRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                collection rate
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(collectionRate, 100)}
              sx={{
                height: 14,
                borderRadius: 7,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 7,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                },
              }}
            />
            <Grid container spacing={2} mt={2.5}>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {formatCurrency(stats.totalAmountPending)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Followups
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stats.pendingFollowups}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Due Today
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stats.followupsDueToday}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <DeviceMixCard
            hygrometer={stats.totalHygrometers}
            hygrometerWithSolar={stats.totalHygrometersWithSolar}
            tradomation={stats.totalTradomation}
            total={stats.totalInstallations}
          />
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
        }}
      >
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Payment Status
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          How installations are distributed by payment completion
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <PaymentStatusCard
            label="Fully Paid"
            count={stats.fullyPaidInstallations}
            total={stats.totalRecords}
            color={theme.palette.success.main}
          />
          <PaymentStatusCard
            label="Partially Paid"
            count={stats.partiallyPaidInstallations}
            total={stats.totalRecords}
            color={theme.palette.warning.main}
          />
          <PaymentStatusCard
            label="Unpaid"
            count={stats.unpaidInstallations}
            total={stats.totalRecords}
            color={theme.palette.error.main}
          />
        </Stack>
      </Paper>

      <Box mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Regional trends, collections, and representative performance
        </Typography>
      </Box>
      <DashboardCharts installations={installations} payments={payments} />

      {isSuperAdmin && <AdminDangerZone />}
    </Box>
  );
}
