'use client';
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import Link from '@/components/Link';

const DRAWER_WIDTH = 248;

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: DashboardOutlined },
  { href: '/invoices', label: 'Рахунки', icon: ReceiptLongOutlined },
  { href: '/clients', label: 'Клієнти', icon: PeopleAltOutlined },
  { href: '/settings', label: 'Налаштування', icon: SettingsOutlined },
] as const;

type AppShellProps = {
  user: { name: string; email: string };
  signOutAction: () => Promise<void>;
  children: ReactNode;
};

export function AppShell({ user, signOutAction, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Stack sx={{ height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" component={Link} href="/dashboard" color="primary" sx={{ textDecoration: 'none' }}>
          Freelance Invoices
        </Typography>
      </Toolbar>
      <List sx={{ px: 1, flexGrow: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <ListItemButton
            key={href}
            component={Link}
            href={href}
            selected={pathname.startsWith(href)}
            onClick={() => setMobileOpen(false)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Icon />
            </ListItemIcon>
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
      <Stack direction="row" spacing={1.5} sx={{ p: 2, alignItems: 'center' }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>{user.name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {user.email}
          </Typography>
        </Box>
        <form action={signOutAction}>
          <Tooltip title="Вийти">
            <IconButton type="submit" aria-label="Вийти" size="small">
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </form>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar>
          <IconButton edge="start" aria-label="Відкрити меню" onClick={() => setMobileOpen(true)}>
            <MenuOutlined />
          </IconButton>
          <Typography variant="h6" color="primary" sx={{ ml: 1 }}>
            Freelance Invoices
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 4 } }}>
        <Toolbar sx={{ display: { md: 'none' } }} />
        {children}
      </Box>
    </Box>
  );
}
