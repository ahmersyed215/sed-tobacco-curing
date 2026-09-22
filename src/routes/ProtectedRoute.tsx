import { Box, Button, Typography } from '@mui/material';
import { Navigate, Outlet } from 'react-router-dom';
import { useAccess } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import type { Permission } from '@/types';

function AccessMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {body}
        </Typography>
        <Button variant="outlined" onClick={() => logout()}>
          Sign out
        </Button>
      </Box>
    </Box>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { isLoading, profile, isError } = useAccess();

  if (loading || isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isError || !profile) {
    return (
      <AccessMessage
        title="Access profile unavailable"
        body="Your sign-in worked, but the app could not load your role and permissions. Sign out and try again."
      />
    );
  }
  if (profile.isDeleted) {
    return (
      <AccessMessage
        title="Account disabled"
        body="This profile has been removed. Ask a super admin if you still need access."
      />
    );
  }

  return <Outlet />;
}

export function PermissionRoute({ permission }: { permission: Permission }) {
  const { isLoading, can } = useAccess();

  if (isLoading) return <LoadingScreen />;
  if (!can(permission)) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function DefaultRedirect() {
  const { isLoading, allowedPath } = useAccess();

  if (isLoading) return <LoadingScreen />;
  if (!allowedPath) {
    return (
      <Box sx={{ maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          No access assigned
        </Typography>
        <Typography color="text.secondary">
          Your account can sign in, but no areas are turned on yet. Ask a super admin to grant access.
        </Typography>
      </Box>
    );
  }

  return <Navigate to={allowedPath} replace />;
}

export function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
