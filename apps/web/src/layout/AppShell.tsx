import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useSessionStore } from '../session/sessionStore';

type SidebarContentProps = {
  email: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
};

function SidebarContent({ email, onNavigate, onLogout }: SidebarContentProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
      isActive
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
    }`;

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <div className="px-4 py-5 text-base font-semibold tracking-tight text-white">
        Location Management
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
        <NavLink to="/map" className={linkClass} onClick={onNavigate}>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4 shrink-0"
          >
            <circle cx="10" cy="10" r="3" />
            <path d="M10 2v2m0 12v2M2 10h2m12 0h2" strokeLinecap="round" />
          </svg>
          Map
        </NavLink>
        <NavLink to="/upload" className={linkClass} onClick={onNavigate}>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4 shrink-0"
          >
            <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14.5v1.5h12v-1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload
        </NavLink>
      </nav>

      <div className="mt-auto px-4 py-4">
        {email && <p className="truncate text-xs text-slate-400">{email}</p>}
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 cursor-pointer text-sm font-medium text-white hover:text-slate-200"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const state = useSessionStore((s) => s.state);
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const email = state.kind === 'signedIn' ? state.user.email : null;

  useEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-dvh flex-col md:flex-row">
      <header className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="cursor-pointer rounded-md p-1.5 text-slate-200 hover:bg-slate-800 hover:text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5"
          >
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-base font-semibold tracking-tight">Location Management</span>
      </header>

      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col">
        <SidebarContent email={email} onLogout={handleLogout} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            data-testid="drawer-backdrop"
            className="fixed inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="relative z-10 flex h-full w-64 flex-col outline-none"
          >
            <SidebarContent
              email={email}
              onNavigate={() => setDrawerOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
