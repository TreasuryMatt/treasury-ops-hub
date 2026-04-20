import React from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function GovBanner() {
  return (
    <section className="usa-banner" aria-label="Official website of the United States government">
      <div className="usa-banner__header">
        <div className="usa-banner__inner">
          <div className="grid-col-auto">
            <img
              aria-hidden="true"
              className="usa-banner__header-flag"
              src="/us_flag_small.png"
              alt="U.S. flag"
            />
          </div>
          <div className="grid-col-fill" aria-hidden="true">
            <p className="usa-banner__header-text">An official website of the United States government</p>
            <p className="usa-banner__header-action">Secure Treasury intake portal</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function IntakePortalLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <span className="usa-spinner" aria-label="Loading" />
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.userType !== 'customer') return <Navigate to="/staffing/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--usa-base-lightest)' }}>
      <a className="usa-skipnav" href="#main-content">Skip to main content</a>
      <GovBanner />
      <div style={{ borderBottom: '1px solid var(--usa-base-lighter)', background: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--usa-base)' }}>U.S. Department of the Treasury</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--usa-primary-darker)' }}>Intake Portal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/intake" className="usa-button usa-button--unstyled">My submissions</Link>
            <span style={{ color: 'var(--usa-base-dark)' }}>{user.displayName}</span>
            <button className="usa-button usa-button--outline usa-button--sm" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>
      <main id="main-content" style={{ maxWidth: 1120, margin: '0 auto', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
