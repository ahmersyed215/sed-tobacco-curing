import type { ReactNode } from 'react';
import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import type { ChartDataPoint, DailyInstallationPoint } from '@/types';

const COLORS = ['#1B5E20', '#F57C00', '#0288D1', '#7B1FA2', '#C62828', '#455A64', '#6D4C41'];

interface Props {
  distributionData: ChartDataPoint[];
  distributionTitle: string;
  dailyData: DailyInstallationPoint[];
  dailyTitle: string;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2.5,
        minHeight: 420,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
        background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Live filtered analytics
      </Typography>
      <Box sx={{ flex: 1, minHeight: 300 }}>{children}</Box>
    </Paper>
  );
}

export function StatisticsCharts({
  distributionData,
  distributionTitle,
  dailyData,
  dailyTitle,
}: Props) {
  const theme = useTheme();
  const positiveDistribution = distributionData.filter(
    (entry) => Number.isFinite(entry.value) && entry.value > 0,
  );
  const safeDailyData = dailyData.filter(
    (point) =>
      Number.isFinite(point.hygrometer) &&
      Number.isFinite(point.hygrometerWithSolar) &&
      Number.isFinite(point.tradomation) &&
      Number.isFinite(point.total),
  );

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ xs: '1fr', lg: '5fr 7fr' }}
      gap={2.5}
    >
      <ChartCard title={distributionTitle}>
        {positiveDistribution.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 8, textAlign: 'center' }}>
            No data for the selected filters
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={positiveDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={108}
                paddingAngle={3}
                label={false}
              >
                {positiveDistribution.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={dailyTitle}>
        {safeDailyData.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 8, textAlign: 'center' }}>
            No installations in the selected date range
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safeDailyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={alpha('#000', 0.08)} />
              <XAxis
                dataKey="label"
                interval="preserveStartEnd"
                minTickGap={24}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as DailyInstallationPoint | undefined;
                  return point?.date ?? '';
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="hygrometer"
                name="Hygrometer"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="hygrometerWithSolar"
                name="Hygrometer with Solar"
                stroke={theme.palette.info.main}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="tradomation"
                name="Tradomation"
                stroke={theme.palette.secondary.main}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </Box>
  );
}
