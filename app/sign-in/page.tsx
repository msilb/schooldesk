'use client';
import { useState } from 'react';
import { BookOpen, ArrowRight, LockKeyhole } from 'lucide-react';
export default function SignIn() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <div className="login-card">
        <span className="logo">
          <BookOpen size={29} />
        </span>
        <span className="eyebrow">YOUR FAMILY’S SPACE</span>
        <h1>
          Welcome to
          <br />
          Schooldesk.
        </h1>
        <p>
          School days, beautifully organised.
          <br />
          Sign in with your family account.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const form = new FormData(e.currentTarget);
            try {
              const response = await fetch('/api/auth/sign-in/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
              });
              if (!response.ok) {
                setError('Sign-in failed. Check your email and password.');
                return;
              }
              window.location.assign('/');
            } catch {
              setError('Unable to reach your school desk. Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Signing in…' : 'Open school desk'}
            <ArrowRight size={18} />
          </button>
        </form>
        <small>
          <LockKeyhole size={14} />
          Invitation only · no public registration
        </small>
      </div>
    </main>
  );
}
