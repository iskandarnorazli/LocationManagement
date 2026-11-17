import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useSessionStore } from '../session/sessionStore';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const state = useSessionStore((s) => s.state);
  const location = useLocation();

  if (state.kind === 'checking') {
    return (
      <div role="status" aria-label="Checking session">
        Loading...
      </div>
    );
  }

  if (state.kind !== 'signedIn') {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
