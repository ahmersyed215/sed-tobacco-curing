import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {
  useInstallations,
  useInstallation,
  usePayments,
  useAddPayment,
  useUpdatePayment,
  useDeletePayment,
} from '@/hooks/useInstallations';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PaymentFormDialog } from '@/features/payments/PaymentFormDialog';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { exportToCsv, exportToExcel, mapPaymentsForExport } from '@/services/exportService';
import { formatCurrency, formatDate } from '@/utils';
import type { Payment, PaymentFormData } from '@/types';

export function PaymentsPage() {
  const { installationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: installations = [], isLoading: loadingList } = useInstallations();
  const { data: selectedInstallation, isLoading: loadingInstallation } = useInstallation(installationId);
  const { data: payments = [], isLoading: loadingPayments } = usePayments(installationId);
  const addMutation = useAddPayment();
  const updateMutation = useUpdatePayment();
  const deleteMutation = useDeletePayment();

  const [selectedId, setSelectedId] = useState(installationId ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const activeInstallation = useMemo(() => {
    const id = installationId ?? selectedId;
    return installations.find((i) => i.id === id) ?? selectedInstallation;
  }, [installationId, selectedId, installations, selectedInstallation]);

  const installationReceiptId = useMemo(() => {
    if (activeInstallation?.latestReceiptId?.trim()) {
      return activeInstallation.latestReceiptId.trim();
    }
    const firstPayment = payments.find((payment) => payment.receiptId?.trim());
    return firstPayment?.receiptId?.trim() ?? '';
  }, [activeInstallation, payments]);

  const handleAddPayment = async (data: PaymentFormData) => {
    if (!activeInstallation || !user?.email) return;

    if (data.amount > activeInstallation.amountPending) {
      setSnackbar({ open: true, message: 'Payment amount exceeds pending balance', severity: 'error' });
      return;
    }

    try {
      await addMutation.mutateAsync({
        installationId: activeInstallation.id,
        data,
        userEmail: user.email,
      });
      setDialogOpen(false);
      setSnackbar({ open: true, message: 'Payment added successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to add payment',
        severity: 'error',
      });
    }
  };

  const handleUpdatePayment = async (data: PaymentFormData) => {
    if (!activeInstallation || !editingPayment) return;

    const maxAllowed =
      activeInstallation.amountPending + editingPayment.amount;
    if (data.amount > maxAllowed) {
      setSnackbar({ open: true, message: 'Payment amount exceeds pending balance', severity: 'error' });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        installationId: activeInstallation.id,
        paymentId: editingPayment.id,
        data,
      });
      setDialogOpen(false);
      setEditingPayment(undefined);
      setSnackbar({ open: true, message: 'Payment updated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update payment',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (!activeInstallation || !window.confirm('Delete this payment?')) return;
    try {
      await deleteMutation.mutateAsync({
        installationId: activeInstallation.id,
        paymentId: payment.id,
      });
      setSnackbar({ open: true, message: 'Payment deleted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete payment', severity: 'error' });
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const data = mapPaymentsForExport(
      payments.map((p) => ({
        ...p,
        farmerName: activeInstallation?.farmerName,
      })),
    );
    const fileName = `payments-${activeInstallation?.farmerName ?? 'all'}-${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') exportToExcel(data, 'Payments', fileName);
    else exportToCsv(data, fileName);
  };

  const columns: GridColDef[] = [
    { field: 'receiptId', headerName: 'Receipt ID', flex: 1, minWidth: 150 },
    {
      field: 'paymentDate',
      headerName: 'Payment Date',
      width: 130,
      valueFormatter: (value: Date) => formatDate(value),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 150 },
    { field: 'createdBy', headerName: 'Created By', width: 180 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setEditingPayment(params.row);
                setDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => handleDelete(params.row)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (loadingList || (installationId && loadingInstallation) || (installationId && loadingPayments)) {
    return <LoadingScreen />;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Payment Ledger
      </Typography>

      {!installationId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            select
            fullWidth
            label="Select Installation"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              navigate(`/payments/${e.target.value}`);
            }}
            size="small"
          >
            {installations.map((inst) => (
              <MenuItem key={inst.id} value={inst.id}>
                {inst.farmerName} — {inst.region} ({formatCurrency(inst.amountPending)} pending)
              </MenuItem>
            ))}
          </TextField>
        </Paper>
      )}

      {activeInstallation && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" color="text.secondary">Farmer</Typography>
                <Typography fontWeight={600}>{activeInstallation.farmerName}</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">Total Amount</Typography>
                <Typography fontWeight={600}>{formatCurrency(activeInstallation.totalAmount)}</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">Received</Typography>
                <Typography fontWeight={600} color="success.main">
                  {formatCurrency(activeInstallation.amountReceived)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">Receipt ID</Typography>
                <Typography fontWeight={600}>{installationReceiptId || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="caption" color="text.secondary">Pending</Typography>
                <Typography fontWeight={600} color="warning.main">
                  {formatCurrency(activeInstallation.amountPending)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={2} display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                <Button
                  startIcon={<FileDownloadIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => handleExport('excel')}
                >
                  Excel
                </Button>
                <Button
                  startIcon={<FileDownloadIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => handleExport('csv')}
                >
                  CSV
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setEditingPayment(undefined);
                    setDialogOpen(true);
                  }}
                  disabled={activeInstallation.amountPending <= 0}
                >
                  Add Payment
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ height: 480, bgcolor: 'background.paper', borderRadius: 2 }}>
            <DataGrid
              rows={payments}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              disableRowSelectionOnClick
              density="compact"
            />
          </Box>
        </>
      )}

      {activeInstallation && (
        <PaymentFormDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingPayment(undefined);
          }}
          onSubmit={editingPayment ? handleUpdatePayment : handleAddPayment}
          installationId={activeInstallation.id}
          installationReceiptId={installationReceiptId}
          maxAmount={activeInstallation.amountPending}
          initialData={editingPayment}
          loading={addMutation.isPending || updateMutation.isPending}
        />
      )}

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
}
