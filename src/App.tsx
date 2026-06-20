import { AppProviders } from '@/app/AppProviders';
import { AppRoutes } from '@/routes/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
