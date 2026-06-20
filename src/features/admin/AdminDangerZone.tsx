import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useDeleteAllApplicationData } from '@/hooks/useAdmin';
import { AppSnackbar } from '@/components/common/AppSnackbar';

const CONFIRM_TEXT = 'DELETE ALL';

export function AdminDangerZone() {
  const deleteMutation = useDeleteAllApplicationData();
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleDelete = async () => {
    try {
      const result = await deleteMutation.mutateAsync();
      setSnackbar({
        open: true,
        message: `Deleted ${result.installations} installations and ${result.payments} payments.`,
        severity: 'success',
      });
      setOpen(false);
      setConfirmValue('');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete data',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Alert
        severity="error"
        variant="outlined"
        sx={{
          mt: 3,
          borderRadius: 3,
          borderWidth: 2,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Administrator Danger Zone
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Permanently delete all installations, payments, and receipt counters. User accounts are
          not removed. This cannot be undone.
        </Typography>
        <Button
          color="error"
          variant="contained"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setOpen(true)}
        >
          Delete All Application Data
        </Button>
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete all application data?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This will remove every installation and payment record from Firestore. Type{' '}
            <strong>{CONFIRM_TEXT}</strong> to confirm.
          </Typography>
          <TextField
            fullWidth
            label={`Type ${CONFIRM_TEXT}`}
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={confirmValue !== CONFIRM_TEXT || deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Everything'}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </>
  );
}
