import { Routes, Route, Navigate } from 'react-router-dom';
import { DefaultRedirect, PermissionRoute, ProtectedRoute, PublicRoute } from '@/routes/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InstallationsPage } from '@/pages/InstallationsPage';
import { InstallationFormPage } from '@/pages/InstallationFormPage';
import { InstallationDetailPage } from '@/pages/InstallationDetailPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { FollowupsPage } from '@/pages/FollowupsPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ImportPage } from '@/pages/ImportPage';
import { UsersPage } from '@/pages/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DefaultRedirect />} />
          <Route element={<PermissionRoute permission="dashboard" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<PermissionRoute permission="installations" />}>
            <Route path="/installations" element={<InstallationsPage />} />
            <Route path="/installations/new" element={<InstallationFormPage />} />
            <Route path="/installations/:id" element={<InstallationDetailPage />} />
            <Route path="/installations/:id/edit" element={<InstallationFormPage />} />
          </Route>
          <Route element={<PermissionRoute permission="payments" />}>
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payments/:installationId" element={<PaymentsPage />} />
          </Route>
          <Route element={<PermissionRoute permission="followups" />}>
            <Route path="/followups" element={<FollowupsPage />} />
          </Route>
          <Route element={<PermissionRoute permission="inventory" />}>
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<PermissionRoute permission="expenses" />}>
            <Route path="/expenses" element={<ExpensesPage />} />
          </Route>
          <Route element={<PermissionRoute permission="statistics" />}>
            <Route path="/statistics" element={<StatisticsPage />} />
          </Route>
          <Route element={<PermissionRoute permission="import" />}>
            <Route path="/import" element={<ImportPage />} />
          </Route>
          <Route element={<PermissionRoute permission="users" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
