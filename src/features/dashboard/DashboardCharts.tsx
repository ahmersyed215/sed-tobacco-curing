import type { ReactNode } from 'react';
import { Grid, Paper, Typography, alpha, useTheme } from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { InstallationWithCalculations, Payment } from '@/types';
import {
  getInstallationsByRegion,
  getInstallationsByDeviceType,
  getCollectionsByMonth,
  getRegionWiseCollection,
  getRepresentativePerformance,
} from '@/services/statsService';
import { formatCurrency } from '@/utils';

const COLORS = ['#1B5E20', '#F57C00', '#0288D1', '#7B1FA2', '#C62828'];

interface Props {
  installations: InstallationWithCalculations[];
  payments: Payment[];
}

function ChartCard({
  title,
  subtitle,
  children,
  height = 380,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
}) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2.5,
        height,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        boxShadow: '0 8px 24px rgba(26, 29, 33, 0.06)',
        background: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
      }}
    >
      <Typography variant="h6" fontWeight={700} mb={subtitle ? 0.5 : 2}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

export function DashboardCharts({ installations, payments }: Props) {
  const byRegion = getInstallationsByRegion(installations);
  const byDeviceType = getInstallationsByDeviceType(installations);
  const byMonth = getCollectionsByMonth(payments);
  const regionCollection = getRegionWiseCollection(installations);
  const sedPerformance = getRepresentativePerformance(installations, 'sedRepresentative');

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <ChartCard title="Installations by Region" subtitle="Regional distribution">
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={byRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1B5E20" name="Installations" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartCard title="Installations by Device Type" subtitle="Hygrometer vs Tradomation">
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={byDeviceType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                label
              >
                {byDeviceType.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartCard title="Collections by Month" subtitle="Monthly payment trends">
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#F57C00"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                name="Collected"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartCard title="Region Wise Collection" subtitle="Amount collected per region">
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={regionCollection}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#0288D1" name="Collected" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      <Grid item xs={12}>
        <ChartCard
          title="SED Representative Performance"
          subtitle="Top 10 by collection amount"
          height={400}
        >
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={sedPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#7B1FA2" name="Collected" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
    </Grid>
  );
}
