import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';
import type { DailyInstallationSummary } from '@/types';

interface Props {
  title: string;
  summary: DailyInstallationSummary;
  icon: ReactNode;
  accent: string;
}

function DeviceBar({
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
    <Box>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={700}>
          {count}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(theme.palette.divider, 0.5),
          '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: color },
        }}
      />
    </Box>
  );
}

export function DailyInstallationsCard({ title, summary, icon, accent }: Props) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: accent,
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight={700} color={accent} lineHeight={1.2}>
            {summary.total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {summary.total === 1 ? 'installation' : 'installations'} recorded
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: alpha(accent, 0.12),
            borderRadius: 2.5,
            p: 1.2,
            color: accent,
            display: 'flex',
          }}
        >
          {icon}
        </Box>
      </Box>

      {summary.total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No installations on this day yet.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          <DeviceBar
            label="Hygrometer"
            count={summary.hygrometer}
            total={summary.total}
            color={theme.palette.primary.main}
          />
          <DeviceBar
            label="Solar Hygro"
            count={summary.hygrometerWithSolar}
            total={summary.total}
            color={theme.palette.info.main}
          />
          <DeviceBar
            label="Tradomation"
            count={summary.tradomation}
            total={summary.total}
            color={theme.palette.secondary.main}
          />
        </Stack>
      )}
    </Paper>
  );
}
