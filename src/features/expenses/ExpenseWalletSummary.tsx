import { Box, Grid, Paper, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { ManagerWalletSummary } from '@/types';
import { formatCurrency } from '@/utils';

interface Props {
  summaries: ManagerWalletSummary[];
  isSuperAdmin: boolean;
}

export function ExpenseWalletSummary({ summaries, isSuperAdmin }: Props) {
  if (summaries.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Manager wallet
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          No wallet activity yet.
        </Typography>
      </Paper>
    );
  }

  if (!isSuperAdmin && summaries.length === 1) {
    const row = summaries[0];
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Your wallet
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Outflows
            </Typography>
            <Typography variant="h6">{formatCurrency(row.totalOutflow)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Inflows
            </Typography>
            <Typography variant="h6">{formatCurrency(row.totalInflow)}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Debt
            </Typography>
            <Typography variant="h6" color={row.debt > 0 ? 'error.main' : 'success.main'}>
              {formatCurrency(row.debt)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  }

  const columns: GridColDef[] = [
    { field: 'walletManagerName', headerName: 'Manager', flex: 1, minWidth: 160 },
    {
      field: 'totalOutflow',
      headerName: 'Outflows',
      width: 140,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: 'totalInflow',
      headerName: 'Inflows',
      width: 140,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: 'debt',
      headerName: 'Debt',
      width: 140,
      valueFormatter: (value: number) => formatCurrency(value),
    },
  ];

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Manager wallets
      </Typography>
      <Box sx={{ height: Math.min(320, 80 + summaries.length * 52) }}>
        <DataGrid
          rows={summaries}
          columns={columns}
          getRowId={(row) => row.walletManagerUid}
          hideFooter={summaries.length <= 5}
          pageSizeOptions={[5, 10]}
          initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
          density="compact"
          disableRowSelectionOnClick
        />
      </Box>
    </Paper>
  );
}
