import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

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

function IntakeAccountDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="account-dropdown intake-account-dropdown" ref={ref}>
      <button
        className="account-dropdown__btn"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="account_circle" color="var(--usa-primary-darker)" size={26} />
      </button>
      {open && (
        <div className="account-dropdown__menu">
          <div className="account-dropdown__identity">
            <span className="account-dropdown__name">{user.displayName}</span>
          </div>
          <div className="account-dropdown__divider" />
          <Link to="/intake" className="account-dropdown__item" onClick={() => setOpen(false)}>
            My submissions
          </Link>
          <div className="account-dropdown__divider" />
          <button className="account-dropdown__item account-dropdown__item--signout" onClick={logout}>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function IntakePortalLayout() {
  const { user, loading } = useAuth();

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
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/favicon.svg" alt="U.S. Department of the Treasury seal" style={{ width: 44, height: 44, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: 'var(--usa-base)' }}>U.S. Department of the Treasury</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--usa-primary-darker)', lineHeight: 1.2 }}>Digital Services Intake Portal</div>
            </div>
          </div>
          <IntakeAccountDropdown />
        </div>
      </div>
      <main id="main-content" style={{ maxWidth: 1120, margin: '0 auto', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
