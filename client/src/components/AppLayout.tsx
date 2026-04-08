import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';

function GovBanner() {
  const [expanded, setExpanded] = useState(false);
  const id = 'gov-banner-content';

  return (
    <section className="usa-banner" aria-label="Official website of the United States government">
      <div className="usa-accordion">
        <header className="usa-banner__header">
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
              <p className="usa-banner__header-text">
                An official website of the United States government
              </p>
              <p className="usa-banner__header-action">Here's how you know</p>
            </div>
            <button
              type="button"
              className="usa-accordion__button usa-banner__button"
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="usa-banner__button-text">Here's how you know</span>
            </button>
          </div>
        </header>
        <div
          className="usa-banner__content usa-accordion__content"
          id={id}
          hidden={!expanded}
        >
          <div className="grid-row grid-gap-lg">
            <div className="usa-banner__guidance">
              <img
                className="usa-banner__icon usa-media-block__img"
                src="/icon-dot-gov.svg"
                role="img"
                alt="Dot gov"
                aria-hidden="true"
              />
              <div className="usa-media-block__body">
                <p>
                  <strong>Official websites use .gov</strong>
                  <br />
                  A <strong>.gov</strong> website belongs to an official government organization in the United States.
                </p>
              </div>
            </div>
            <div className="usa-banner__guidance">
              <img
                className="usa-banner__icon usa-media-block__img"
                src="/icon-https.svg"
                role="img"
                alt="HTTPS"
                aria-hidden="true"
              />
              <div className="usa-media-block__body">
                <p>
                  <strong>Secure .gov websites use HTTPS</strong>
                  <br />
                  A <strong>lock</strong> or <strong>https://</strong> means you've safely connected to the .gov website.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="usa-header" role="banner">
      <NavLink to="/dashboard" className="usa-header__title" style={{ textDecoration: 'none' }}>
        <img
          src="/treasury-seal-white-simple.svg"
          alt="U.S. Department of the Treasury seal"
          className="usa-header__seal"
        />
        <div className="usa-header__branding">
          <span className="usa-header__agency">U.S. Department of the Treasury</span>
          <span className="usa-header__app-name">Treasury Operations Hub</span>
        </div>
      </NavLink>
      {user && (
        <div className="usa-header__user">
          <span className="usa-header__user-name">{user.displayName}</span>
          <span className="usa-header__user-role">{user.role}</span>
          <button className="usa-header__logout" onClick={logout}>Sign out</button>
        </div>
      )}
    </header>
  );
}

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <span className="usa-spinner" aria-label="Loading" />
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <a className="usa-skipnav" href="#main-content">Skip to main content</a>
      <GovBanner />
      <SiteHeader />
      <div className="app-body">
        <Sidebar />
        <main id="main-content" className="usa-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminOnly() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function EditorOnly() {
  const { user } = useAuth();
  if (user?.role === 'viewer') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
