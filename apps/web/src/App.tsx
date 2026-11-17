import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <main>
        <h1>Location Management</h1>
        <AppRoutes />
      </main>
    </BrowserRouter>
  );
}
