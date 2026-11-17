import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '../layout/AppShell';
import { LoginPage } from '../pages/LoginPage';
import { MapPage } from '../pages/MapPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UploadPage } from '../pages/UploadPage';
import { RequireAuth } from './RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/map" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/map" element={<MapPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
