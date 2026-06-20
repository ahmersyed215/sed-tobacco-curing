import { Box, CircularProgress } from '@mui/material';

export function LoadingScreen() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
}
