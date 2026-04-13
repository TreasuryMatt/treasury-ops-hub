import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [caiaId, setCaiaId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(caiaId.trim());
      navigate('/staffing/dashboard');
    } catch {
      setError('User not found or inactive. Check your CAIA ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__banner">
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 11,
              background: 'linear-gradient(180deg,#B22234 0%,#B22234 7.7%,#fff 7.7%,#fff 15.4%,#B22234 15.4%,#B22234 23.1%,#fff 23.1%,#fff 30.8%,#B22234 30.8%,#B22234 38.5%,#fff 38.5%,#fff 46.2%,#B22234 46.2%,#B22234 53.9%,#fff 53.9%,#fff 61.5%,#B22234 61.5%,#B22234 69.2%,#fff 69.2%,#fff 76.9%,#B22234 76.9%,#B22234 84.6%,#fff 84.6%,#fff 92.3%,#B22234 92.3%,#B22234 100%)',
              border: '1px solid rgba(0,0,0,.15)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <strong>An official website of the United States government</strong>
        </div>

        <div className="login-card__header">
          <div className="login-card__agency">U.S. Department of the Treasury</div>
          <div className="login-card__title">Operations Hub</div>
          <div className="login-card__subtitle">Secure PIV / CAIA authentication required</div>
        </div>

        <div className="login-card__body">
          <form onSubmit={handleSubmit}>
            <div className="usa-form-group">
              <label className="usa-label" htmlFor="caia-id">CAIA ID</label>
              <input
                id="caia-id"
                className="usa-input"
                value={caiaId}
                onChange={(e) => setCaiaId(e.target.value)}
                placeholder="e.g. ADMIN001"
                autoFocus
                required
                autoComplete="username"
              />
              <span className="usa-hint">
                Dev mode — test accounts: <strong>ADMIN001</strong> (admin), <strong>MGR001</strong> (manager), <strong>EDIT001</strong> (editor), <strong>VIEW001</strong> (viewer)
              </span>
            </div>

            {error && (
              <div className="usa-alert usa-alert--error mb-3" role="alert">
                <strong>Sign-in failed.</strong> {error}
              </div>
            )}

            <button
              className="usa-button usa-button--primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              type="submit"
              disabled={loading || !caiaId.trim()}
            >
              {loading
                ? <><span className="usa-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="login-card__footer">
          For access issues, contact your system administrator.
        </div>
      </div>
    </div>
  );
}
