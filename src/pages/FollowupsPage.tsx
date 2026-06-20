import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import PaymentsIcon from '@mui/icons-material/Payments';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useInstallations, useUpdateFollowupDate } from '@/hooks/useInstallations';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AppSnackbar } from '@/components/common/AppSnackbar';
import { getFollowupInstallations } from '@/services/statsService';
import { exportToCsv, exportToExcel, mapFollowupsForExport } from '@/services/exportService';
import { formatCurrency, formatDate, formatDateInput, parseInputDate } from '@/utils';

export function FollowupsPage() {
  const navigate = useNavigate();
  const { data: installations = [], isLoading } = useInstallations();
  const updateFollowup = useUpdateFollowupDate();
  const [editId, setEditId] = useState<string | null>(null);
  const [followupDate, setFollowupDate] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const followups = useMemo(() => getFollowupInstallations(installations), [installations]);

  const handleSaveFollowup = async () => {
    if (!editId) return;
    try {
      await updateFollowup.mutateAsync({
        id: editId,
        followupDate: followupDate ? parseInputDate(followupDate) : null,
      });
      setEditId(null);
      setSnackbar({ open: true, message: 'Follow-up date updated', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to update follow-up date', severity: 'error' });
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const data = mapFollowupsForExport(followups);
    const fileName = `followups-${new Date().toISOString().split('T')[0]}`;
    if (format === 'excel') exportToExcel(data, 'Followups', fileName);
    else exportToCsv(data, fileName);
  };

  const columns: GridColDef[] = [
    { field: 'farmerName', headerName: 'Farmer Name', flex: 1, minWidth: 150 },
    { field: 'farmerNumber', headerName: 'Phone Number', width: 140 },
    { field: 'region', headerName: 'Region', width: 120 },
    { field: 'depo', headerName: 'Depo', width: 120 },
    { field: 'sedRepresentative', headerName: 'SED Rep', width: 130 },
    { field: 'ptcRepresentative', headerName: 'PTC Rep', width: 130 },
    {
      field: 'amountPending',
      headerName: 'Pending Amount',
      width: 140,
      valueFormatter: (value: number) => formatCurrency(value),
    },
    {
      field: 'followupDate',
      headerName: 'Followup Date',
      width: 130,
      valueFormatter: (value: Date | undefined) => formatDate(value),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Open Installation">
            <IconButton size="small" onClick={() => navigate(`/installations/${params.row.id}`)}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Followup Date">
            <IconButton
              size="small"
              onClick={() => {
                setEditId(params.row.id);
                setFollowupDate(formatDateInput(params.row.followupDate));
              }}
            >
              <EditCalendarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add Payment">
            <IconButton size="small" onClick={() => navigate(`/payments/${params.row.id}`)}>
              <PaymentsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Follow-up Management
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

      <Box sx={{ height: 620, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={followups}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'followupDate', sort: 'asc' }] },
          }}
          disableRowSelectionOnClick
          density="compact"
        />
      </Box>

      <Dialog open={Boolean(editId)} onClose={() => setEditId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Follow-up Date</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="Follow-up Date"
            InputLabelProps={{ shrink: true }}
            value={followupDate}
            onChange={(e) => setFollowupDate(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveFollowup} disabled={updateFollowup.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Box>
  );
}
