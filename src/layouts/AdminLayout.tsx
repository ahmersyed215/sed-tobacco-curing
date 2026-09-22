import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventNoteIcon from '@mui/icons-material/EventNote';
import BarChartIcon from '@mui/icons-material/BarChart';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { ROLE_LABELS } from '@/auth/access';
import { NAV_ITEMS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAdmin';

const DRAWER_WIDTH = 260;

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <DashboardIcon />,
  Installations: <DevicesIcon />,
  Payments: <PaymentsIcon />,
  Followups: <EventNoteIcon />,
  Statistics: <BarChartIcon />,
  Inventory: <Inventory2Icon />,
  Expenses: <ReceiptLongIcon />,
  Import: <UploadFileIcon />,
  Users: <PeopleIcon />,
};

export function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { can, profile } = useAccess();
  const visibleNav = NAV_ITEMS.filter((item) => can(item.permission));

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <AgricultureIcon color="primary" />
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            SED Tobacco Curing
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Installation Management
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1 }}>
        {visibleNav.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname.startsWith(item.path)}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{iconMap[item.icon]}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <List sx={{ px: 1, pb: 2 }}>
        <ListItemButton
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          sx={{ borderRadius: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {visibleNav.find((item) => location.pathname.startsWith(item.path))?.label ?? 'SED Tobacco Curing'}
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
            {profile && (
              <Typography variant="caption" color="text.secondary">
                {ROLE_LABELS[profile.role]}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          fontFamily: 'inherit',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
