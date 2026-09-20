import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsIcon from '@mui/icons-material/Payments';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useInstallations, useDeleteInstallation } from '@/hooks/useInstallations';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PaymentStatusChip } from '@/components/common/PaymentStatusChip';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { InstallationFiltersPanel } from '@/features/installations/InstallationFiltersPanel';
import { filterInstallations } from '@/services/statsService';
import { exportToCsv, exportToExcel, mapInstallationsForExport } from '@/services/exportService';
import { formatCurrency, formatDate, formatDeviceTypeLabel } from '@/utils';
import type { InstallationFilters } from '@/types';

const defaultFilters: InstallationFilters = {
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
};

export function InstallationsPage() {
  const navigate = useNavigate();
  const { data: installations = [], isLoading, isError, error } = useInstallations();
  const deleteMutation = useDeleteInstallation();
  const [filters, setFilters] = useState<InstallationFilters>(defaultFilters);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const filtered = useMemo(
    () => filterInstallations(installations, filters),
    [installations, filters],
  );

  const deviceCounts = useMemo(
    () => ({
      total: filtered.length,
      hygrometer: filtered.filter((item) => item.deviceType === 'HYGROMETER').length,
      hygrometerWithSolar: filtered.filter((item) => item.deviceType === 'HYGROMETER_WITH_SOLAR')
        .length,
      tradomation: filtered.filter((item) => item.deviceType === 'TRADOMATION').length,
    }),
    [filtered],
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this installation and all its payments?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      setSnackbar({ open: true, message: 'Installation deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete installation', severity: 'error' });
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const data = mapInstallationsForExport(filtered);
    const fileName = `installations-${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') exportToExcel(data, 'Installations', fileName);
    else exportToCsv(data, fileName);
  };

  const columns: GridColDef[] = [
    {
      field: 'deviceType',
      headerName: 'Device Type',
      width: 200,
      valueFormatter: (value: string) => formatDeviceTypeLabel(value),
    },
    { field: 'latestReceiptId', headerName: 'Receipt ID', width: 140 },
    { field: 'farmerName', headerName: 'Farmer Name', width: 150 },
    { field: 'farmerNumber', headerName: 'Farmer Number', width: 130 },
    { field: 'farmerCNIC', headerName: 'CNIC', width: 140 },
    { field: 'region', headerName: 'Region', width: 110 },
    { field: 'depo', headerName: 'Depo', width: 110 },
    { field: 'sedRepresentative', headerName: 'SED Rep', width: 120 },
    { field: 'ptcRepresentative', headerName: 'PTC Rep', width: 120 },
    {
      field: 'installationDate',
      headerName: 'Installation Date',
      width: 130,
      valueFormatter: (value: Date) => formatDate(value),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 110,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: 'amountReceived',
      headerName: 'Received',
      width: 110,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: 'amountPending',
      headerName: 'Pending',
      width: 110,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    { field: 'deviceId', headerName: 'Device ID', width: 110 },
    {
      field: 'followupDate',
      headerName: 'Followup',
      width: 120,
      valueFormatter: (value: Date | undefined) => formatDate(value),
    },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      width: 140,
      cellClassName: (params) => {
        if (params.value === 'PAID') return 'payment-status-paid';
        if (params.value === 'PARTIALLY_PAID') return 'payment-status-partial';
        return 'payment-status-unpaid';
      },
      renderCell: (params) => <PaymentStatusChip status={params.value} />,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 240,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => navigate(`/installations/${params.row.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/installations/${params.row.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Payments">
            <IconButton size="small" onClick={() => navigate(`/payments/${params.row.id}`)}>
              <PaymentsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Payment">
            <IconButton size="small" onClick={() => navigate(`/payments/${params.row.id}`)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (isLoading) return <LoadingScreen />;

  const loadError =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Failed to load installations'
        : '';

  return (
    <Box>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError.includes('permission') || loadError.includes('Permission')
            ? `${loadError}. Sign in and run: firebase deploy --only firestore:rules`
            : loadError}
        </Alert>
      )}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Installations
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => handleExport('excel')}>
            Export Excel
          </Button>
          <Button startIcon={<FileDownloadIcon />} variant="outlined" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => navigate('/installations/new')}>
            Add Installation
          </Button>
        </Box>
      </Box>

      <InstallationFiltersPanel filters={filters} onChange={setFilters} installations={installations} />

      <Paper sx={{ p: 1.5, mt: 2, mb: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`Total: ${deviceCounts.total}`} color="default" variant="outlined" />
          <Chip
            label={`Hygrometer: ${deviceCounts.hygrometer}`}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }}
          />
          <Chip
            label={`Solar Hygro: ${deviceCounts.hygrometerWithSolar}`}
            sx={{ bgcolor: 'info.main', color: 'info.contrastText', fontWeight: 600 }}
          />
          <Chip
            label={`Tradomation: ${deviceCounts.tradomation}`}
            sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
            Counts update with search, region, depo, and other filters
          </Typography>
        </Stack>
      </Paper>

      <Box sx={{ height: 620, width: '100%', bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
          density="compact"
          sx={{
            fontFamily: 'inherit',
            border: 'none',
            '& .payment-status-unpaid': {
              bgcolor: '#8B0000',
            },
            '& .payment-status-partial': {
              bgcolor: '#F57C00',
            },
            '& .payment-status-paid': {
              bgcolor: '#2E7D32',
            },
            '& .MuiDataGrid-row:hover .payment-status-unpaid': {
              bgcolor: '#6d0000',
            },
            '& .MuiDataGrid-row:hover .payment-status-partial': {
              bgcolor: '#E65100',
            },
            '& .MuiDataGrid-row:hover .payment-status-paid': {
              bgcolor: '#1B5E20',
            },
          }}
        />
      </Box>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
}
