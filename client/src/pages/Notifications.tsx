import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  clearReadNotifications,
} from '../api/notifications';
import { AppNotification } from '../types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_LABELS: Record<string, string> = {
  update_due: 'Update Due',
  update_overdue: 'Overdue Update',
  new_update: 'New Update',
  issue_created: 'Issue Created',
  issue_resolved: 'Issue Resolved',
  issue_reopened: 'Issue Reopened',
  project_status_changed: 'Status Changed',
  assignment_added: 'Assignment Added',
  assignment_removed: 'Assignment Removed',
  pop_expiring: 'PoP Expiring',
};

const TYPE_COLORS: Record<string, string> = {
  update_due: 'var(--usa-warning-dark)',
  update_overdue: 'var(--usa-error)',
  new_update: 'var(--usa-primary)',
  issue_created: 'var(--usa-error)',
  issue_resolved: 'var(--usa-success)',
  issue_reopened: 'var(--usa-warning-dark)',
  project_status_changed: 'var(--usa-primary)',
  assignment_added: 'var(--usa-success)',
  assignment_removed: 'var(--usa-base)',
  pop_expiring: 'var(--usa-accent-warm-dark)',
};

export function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    try {
      const res = await fetchNotifications({ filter });
      if (reset) {
        setNotifications(res.data);
      } else {
        setNotifications((prev) => [...prev, ...res.data]);
      }
      setUnreadCount(res.unreadCount);
      setNextCursor(res.nextCursor);
    } finally {
      if (reset) setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(true); }, [load]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchNotifications({ filter, cursor: nextCursor });
      setNotifications((prev) => [...prev, ...res.data]);
      setUnreadCount(res.unreadCount);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkAll() {
    await markAllRead();
    load(true);
  }

  async function handleMarkRead(n: AppNotification) {
    if (!n.read) {
      await markRead(n.id);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const deleted = notifications.find((n) => n.id === id);
    if (deleted && !deleted.read) setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleClearRead() {
    await clearReadNotifications();
    setNotifications((prev) => prev.filter((n) => !n.read));
  }

  const hasRead = notifications.some((n) => n.read);

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Notifications</h1>
          <p className="usa-page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {hasRead && (
            <button className="usa-button usa-button--outline usa-button--sm" onClick={handleClearRead}>
              Clear read
            </button>
          )}
          <Link to="/settings/notifications" className="usa-button usa-button--outline usa-button--sm">
            Preferences
          </Link>
          {unreadCount > 0 && (
            <button className="usa-button usa-button--sm" onClick={handleMarkAll}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="usa-card" style={{ padding: 0 }}>
        {/* Filter tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--usa-base-lighter)',
          padding: '0 var(--space-3)',
        }}>
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--space-2) var(--space-3)',
                cursor: 'pointer',
                fontWeight: filter === f ? 700 : 400,
                color: filter === f ? 'var(--usa-primary)' : 'var(--usa-base-dark)',
                borderBottom: filter === f ? '2px solid var(--usa-primary)' : '2px solid transparent',
                fontSize: 14,
                marginBottom: -1,
              }}
            >
              {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="notif-page__empty">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="notif-page__empty">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        ) : (
          <>
            <ul className="notif-page__list">
              {notifications.map((n) => {
                const inner = (
                  <>
                    <span className={`notif-item__dot${n.read ? ' notif-item__dot--read' : ''}`} />
                    <span className="notif-item__body">
                      <span className="notif-item__title">
                        {n.title}
                        <span
                          className="notif-page__type-chip"
                          style={{ color: TYPE_COLORS[n.type] ?? 'var(--usa-base)' }}
                        >
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      </span>
                      <span className="notif-item__msg">{n.message}</span>
                      <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                    </span>
                    <button
                      className="notif-item__dismiss"
                      aria-label="Dismiss notification"
                      title="Dismiss"
                      onClick={(e) => handleDelete(e, n.id)}
                    >
                      ×
                    </button>
                  </>
                );

                const cls = `notif-item notif-page__row${n.read ? '' : ' notif-item--unread'}`;

                return n.linkUrl ? (
                  <Link
                    key={n.id}
                    to={n.linkUrl}
                    className={cls}
                    onClick={() => handleMarkRead(n)}
                  >
                    {inner}
                  </Link>
                ) : (
                  <li key={n.id} className={cls} onClick={() => handleMarkRead(n)}>
                    {inner}
                  </li>
                );
              })}
            </ul>

            {nextCursor && (
              <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                <button
                  className="usa-button usa-button--outline usa-button--sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
