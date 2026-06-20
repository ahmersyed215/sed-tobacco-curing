import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
          <Paper sx={{ p: 4, maxWidth: 480, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography color="text.secondary" mb={3}>
              An unexpected error occurred. Please refresh the page or try again later.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
