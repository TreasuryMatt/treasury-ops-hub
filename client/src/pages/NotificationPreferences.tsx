import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { Link } from 'react-router-dom';
import { fetchPreferences, savePreferences } from '../api/notifications';
import { NotificationType, NotificationPreference } from '../types';

interface PrefRow {
  type: NotificationType;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

const ALL_TYPES: Array<{ type: NotificationType; label: string; description: string }> = [
  { type: 'issue_created',        label: 'Issue created',          description: 'When a new risk, issue, or blocker is logged on a project' },
  { type: 'issue_resolved',       label: 'Issue resolved',         description: 'When an issue is marked resolved' },
  { type: 'issue_reopened',       label: 'Issue reopened',         description: 'When a previously resolved issue is reopened' },
  { type: 'project_status_changed', label: 'Project status changed', description: 'When a project\'s overall status (Green / Yellow / Red) changes' },
  { type: 'assignment_added',     label: 'Assignment added',       description: 'When a resource is assigned to a project' },
  { type: 'assignment_removed',   label: 'Assignment removed',     description: 'When a resource is removed from a project' },
  { type: 'pop_expiring',         label: 'PoP expiring',           description: 'When a contractor\'s Period of Performance is approaching its end date' },
  { type: 'update_due',           label: 'Update due',             description: 'When a project status update is coming due' },
  { type: 'update_overdue',       label: 'Update overdue',         description: 'When a project status update is past due' },
  { type: 'new_update',           label: 'New update posted',      description: 'When a new status update is posted on a project' },
];

function buildDefaultRows(saved: NotificationPreference[]): PrefRow[] {
  return ALL_TYPES.map(({ type, label, description }) => {
    const existing = saved.find((p) => p.type === type);
    return {
      type,
      label,
      description,
      inApp: existing?.inApp ?? true,
      email: existing?.email ?? true,
    };
  });
}

export function NotificationPreferences() {
  const [rows, setRows] = useState<PrefRow[]>(buildDefaultRows([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSavedFlag] = useState(false);

  useEffect(() => {
    fetchPreferences()
      .then((prefs) => setRows(buildDefaultRows(prefs)))
      .finally(() => setLoading(false));
  }, []);

  function toggle(type: NotificationType, channel: 'inApp' | 'email') {
    setRows((prev) =>
      prev.map((r) => (r.type === type ? { ...r, [channel]: !r[channel] } : r)),
    );
    setSavedFlag(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await savePreferences(rows.map(({ type, inApp, email }) => ({ type, inApp, email })));
      setSavedFlag(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <div style={{ marginBottom: 'var(--space-1)' }}>
            <Link to="/notifications" style={{ fontSize: 13, color: 'var(--usa-primary)' }}>
              ← Back to Notifications
            </Link>
          </div>
          <h1 className="usa-page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="notifications" color="var(--usa-primary)" size={26} />
            Notification Preferences
          </h1>
          <p className="usa-page-subtitle">Choose which events notify you and through which channels.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {saved && (
            <span style={{ fontSize: 13, color: 'var(--usa-success)', fontWeight: 600 }}>
              ✓ Saved
            </span>
          )}
          <button className="usa-button usa-button--outline usa-button--sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--space-5)', color: 'var(--usa-base)' }}>Loading…</div>
      ) : (
        <div className="usa-card" style={{ padding: 0 }}>
          <table className="usa-table usa-table--borderless" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Event</th>
                <th style={{ width: '30%', fontSize: 13 }}>In-app</th>
                <th style={{ width: '30%', fontSize: 13 }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.type}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--usa-base-dark)', marginTop: 2 }}>
                      {row.description}
                    </div>
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="usa-checkbox__input"
                        checked={row.inApp}
                        onChange={() => toggle(row.type, 'inApp')}
                      />
                      <span style={{ fontSize: 13 }}>{row.inApp ? 'On' : 'Off'}</span>
                    </label>
                  </td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="usa-checkbox__input"
                        checked={row.email}
                        onChange={() => toggle(row.type, 'email')}
                      />
                      <span style={{ fontSize: 13 }}>{row.email ? 'On' : 'Off'}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
