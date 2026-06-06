import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button, Input } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';
import './AuthPage.css';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPage(): ReactElement {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setEmailTouched(false);
    setPasswordTouched(false);
    setErrorMessage(null);
    setLoading(false);
  }, []);

  const emailInvalid = email.length === 0 || !isValidEmail(email);
  const passwordInvalid = password.length < 8;
  const formInvalid = emailInvalid || passwordInvalid;

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (formInvalid || loading) {
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/today', { replace: true });
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Login failed';
      setErrorMessage(message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form-container">
        <div className="auth-card">
          <form className="auth-form login-form" onSubmit={onSubmit}>
            <h1>Log in</h1>
            <p className="greeting">Nice to see you again</p>
            {errorMessage !== null ? <p className="error">{errorMessage}</p> : null}
            <div className="form-fields">
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                  className={undefined}
                  onChange={setEmail}
                  onBlur={() => setEmailTouched(true)}
                />
              </div>
              {emailTouched && emailInvalid ? (
                <p className="field-error">Valid email is required</p>
              ) : null}
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  placeholder="Min 8 characters"
                  disabled={loading}
                  autoComplete="current-password"
                  className={undefined}
                  onChange={setPassword}
                  onBlur={() => setPasswordTouched(true)}
                />
              </div>
              {passwordTouched && passwordInvalid ? (
                <p className="field-error">Password must be at least 8 characters</p>
              ) : null}
            </div>
            <Button
              type="submit"
              fill="solid"
              size="default"
              expand="block"
              color="default"
              disabled={formInvalid || loading}
              className="submit-btn"
              onClick={undefined}
              aria-label={undefined}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
            <p className="auth-link">
              Don&apos;t have an account? <Link to="/register">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
