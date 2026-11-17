import { Credentials } from '@lm/shared';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import type { ApiError } from '../api/client';
import { useSessionStore } from '../session/sessionStore';

type FieldErrors = { email?: string; password?: string };

function formatServerError(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'RATE_LIMITED':
      return 'Too many attempts. Try again in a minute.';
    default:
      return 'Something went wrong. Try again.';
  }
}

export function LoginPage() {
  const state = useSessionStore((s) => s.state);
  const login = useSessionStore((s) => s.login);
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (state.kind === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/map';
    return <Navigate to={from} replace />;
  }

  const submitting = state.kind === 'submitting';
  const serverError = state.kind === 'signedOut' && state.error ? formatServerError(state.error) : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = Credentials.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') {
          next[key] ??= issue.message;
        }
      }
      setFieldErrors(next);
      if (next.email) emailRef.current?.focus();
      else if (next.password) passwordRef.current?.focus();
      return;
    }

    setFieldErrors({});
    await login(parsed.data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-600">Welcome back.</p>

        {serverError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="font-medium text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
