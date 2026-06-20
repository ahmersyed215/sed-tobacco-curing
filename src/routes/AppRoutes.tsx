import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '@/routes/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InstallationsPage } from '@/pages/InstallationsPage';
import { InstallationFormPage } from '@/pages/InstallationFormPage';
import { InstallationDetailPage } from '@/pages/InstallationDetailPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { FollowupsPage } from '@/pages/FollowupsPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/installations" element={<InstallationsPage />} />
          <Route path="/installations/new" element={<InstallationFormPage />} />
          <Route path="/installations/:id" element={<InstallationDetailPage />} />
          <Route path="/installations/:id/edit" element={<InstallationFormPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/:installationId" element={<PaymentsPage />} />
          <Route path="/followups" element={<FollowupsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
