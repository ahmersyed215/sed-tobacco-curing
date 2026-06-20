import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { NEAR_FUTURE_FOLLOWUP_DAYS } from '@/constants';
import type { InstallationWithCalculations } from '@/types';
import { formatCurrency, formatDate, getFollowupUrgency } from '@/utils';

interface Props {
  followups: InstallationWithCalculations[];
}

function urgencyChip(urgency: ReturnType<typeof getFollowupUrgency>) {
  switch (urgency) {
    case 'overdue':
      return <Chip size="small" label="Overdue" color="error" />;
    case 'today':
      return <Chip size="small" label="Due today" color="warning" />;
    default:
      return <Chip size="small" label="Coming up" color="info" />;
  }
}

export function FollowupAlertsDialog({ followups }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  const overdueCount = followups.filter(
    (item) => item.followupDate && getFollowupUrgency(item.followupDate) === 'overdue',
  ).length;

  useEffect(() => {
    if (!autoOpened.current && followups.length > 0) {
      setOpen(true);
      autoOpened.current = true;
    }
  }, [followups.length]);

  if (followups.length === 0) return null;

  return (
    <>
      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
          bgcolor: alpha(theme.palette.warning.main, 0.06),
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <WarningAmberIcon color="warning" sx={{ mt: 0.25 }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Follow-ups need attention
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {followups.length} follow-up{followups.length === 1 ? '' : 's'} overdue or within the
                next {NEAR_FUTURE_FOLLOWUP_DAYS} days
                {overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setOpen(true)}>
              View list
            </Button>
            <Button variant="contained" onClick={() => navigate('/followups')}>
              Open Follow-ups
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Follow-ups — overdue &amp; near future
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing follow-ups due today, overdue, or within the next {NEAR_FUTURE_FOLLOWUP_DAYS}{' '}
            days.
          </Alert>
          <List disablePadding>
            {followups.map((item) => {
              const urgency = item.followupDate ? getFollowupUrgency(item.followupDate) : 'soon';
              return (
                <ListItem
                  key={item.id}
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="open installation"
                      onClick={() => {
                        setOpen(false);
                        navigate(`/installations/${item.id}`);
                      }}
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography component="span" fontWeight={700}>
                          {item.farmerName}
                        </Typography>
                        {urgencyChip(urgency)}
                      </Box>
                    }
                    secondary={
                      <>
                        {item.region}
                        {item.depo ? ` · ${item.depo}` : ''} · Follow-up:{' '}
                        {formatDate(item.followupDate)} · Pending:{' '}
                        {formatCurrency(item.amountPending)}
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Dismiss</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpen(false);
              navigate('/followups');
            }}
          >
            Go to Follow-ups page
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
