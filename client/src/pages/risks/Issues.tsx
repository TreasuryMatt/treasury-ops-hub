import React from 'react';
import { Icon } from '../../components/Icon';

export function Issues() {
  return (
    <div className="usa-page">
      <div className="usa-page-header">
        <div>
          <h1 className="usa-page-title">Issues</h1>
          <p className="usa-page-subtitle">Issue tracking will live here once we wire the escalation flow from risks.</p>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-state__icon"><Icon name="report_problem" size={48} /></div>
        <h3>Issues module coming next</h3>
        <p>This page is reserved for escalated issues and their dedicated workflow.</p>
      </div>
    </div>
  );
}
