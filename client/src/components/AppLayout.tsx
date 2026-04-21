import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Navigate, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Icon } from './Icon';
import { fetchNotifications, markAllRead, markRead } from '../api/notifications';
import { AppNotification } from '../types';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchNotifications();
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      // silently ignore — don't break the header
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleMarkAll() {
    await markAllRead();
    load();
  }

  async function handleItemClick(n: AppNotification) {
    if (!n.read) {
      await markRead(n.id);
      load();
    }
    setOpen(false);
  }

  const preview = notifications.slice(0, 8);

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        className="notif-bell__btn"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="notifications" color="var(--usa-white)" size={20} />
        {unreadCount > 0 && (
          <span className="notif-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="notif-dropdown__mark-all" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-dropdown__list">
            {preview.length === 0 ? (
              <p className="notif-dropdown__empty">No notifications yet.</p>
            ) : (
              preview.map((n) => {
                const inner = (
                  <>
                    <span className={`notif-item__dot${n.read ? ' notif-item__dot--read' : ''}`} />
                    <span className="notif-item__body">
                      <span className="notif-item__title">{n.title}</span>
                      <span className="notif-item__msg">{n.message}</span>
                      <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                    </span>
                  </>
                );
                const cls = `notif-item${n.read ? '' : ' notif-item--unread'}`;
                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    to={n.linkUrl}
                    className={cls}
                    onClick={() => handleItemClick(n)}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={cls} onClick={() => handleItemClick(n)}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-dropdown__footer">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountDropdown() {
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
    <div className="account-dropdown" ref={ref}>
      <button
        className="account-dropdown__btn"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="account_circle" color="var(--usa-white)" size={22} />
      </button>

      {open && (
        <div className="account-dropdown__menu">
          <div className="account-dropdown__identity">
            <span className="account-dropdown__name">{user.displayName}</span>
            <span className="account-dropdown__role">{user.role}</span>
          </div>
          <div className="account-dropdown__divider" />
          <Link
            to="/settings/notifications"
            className="account-dropdown__item"
            onClick={() => setOpen(false)}
          >
            <Icon name="tune" size={16} />
            Notification Preferences
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

function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="usa-header" role="banner">
      <NavLink to="/dashboard" className="usa-header__title" style={{ textDecoration: 'none' }}>
        <img
          src="/treasury-seal_white-gear.svg"
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
          <NavLink to="/exec/summary" className="exec-summary-btn">
            <Icon name="star" color="#fff" size={16} />
            Executive Summary
          </NavLink>
          <NotificationBell />
          <span className="usa-header__user-name">{user.displayName}</span>
          <span className="usa-header__user-role">{user.role}</span>
          <AccountDropdown />
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

  if (user.userType === 'customer') {
    return <Navigate to="/intake" replace />;
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

export function IntakeReviewerOnly() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === 'customer') return <Navigate to="/intake" replace />;
  if (!user.isIntakeReviewer && user.role !== 'admin') return <Navigate to="/staffing/dashboard" replace />;
  return <Outlet />;
}
