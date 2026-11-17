import { BrowserRouter, Route, Routes } from 'react-router';
import { ProtoPage } from './proto/ProtoPage';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout prototypes for #11; this branch is never merged. */}
        <Route path="/proto/:layout/:state" element={<ProtoPage />} />
        <Route
          path="*"
          element={
            <main>
              <h1>Location Management</h1>
              <AppRoutes />
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
