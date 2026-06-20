import { Alert, Snackbar } from '@mui/material';

interface Props {
  open: boolean;
  message: string;
  severity?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export function AppSnackbar({ open, message, severity = 'success', onClose }: Props) {
  return (
    <Snackbar open={open} autoHideDuration={5000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
