import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

const COLOR_MAIN  = '#005ea2';
const COLOR_ADMIN = '#3d4551';

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="usa-sidenav-container" aria-label="Side navigation">
      <nav>
        <div className="sidenav-section">
          <div className="sidenav-section-label">Status</div>
          <ul className="usa-sidenav">
            <li>
              <NavLink to="/status/dashboard">
                <Icon name="bar_chart" color={COLOR_MAIN} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/status/projects">
                <Icon name="work" color={COLOR_MAIN} />
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink to="/status/programs">
                <Icon name="folder" color={COLOR_MAIN} />
                Programs
              </NavLink>
            </li>
            <li>
              <NavLink to="/status/applications">
                <Icon name="tune" color={COLOR_MAIN} />
                Applications
              </NavLink>
            </li>
            <li>
              <NavLink to="/status/roadmap">
                <Icon name="timeline" color={COLOR_MAIN} />
                Roadmap
              </NavLink>
            </li>
            <li>
              <NavLink to="/status/reports">
                <Icon name="description" color={COLOR_MAIN} />
                Reports
              </NavLink>
            </li>
          </ul>
        </div>

        {(user?.isIntakeReviewer || user?.role === 'admin') && (
          <div className="sidenav-section">
            <div className="sidenav-section-label">Intake</div>
            <ul className="usa-sidenav">
              <li>
                <NavLink to="/intake/review" end>
                  <Icon name="assessment" color={COLOR_MAIN} />
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/intake/review/submissions">
                  <Icon name="summarize" color={COLOR_MAIN} />
                  Submission Queue
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        <div className="sidenav-section">
          <div className="sidenav-section-label">Staffing</div>
          <ul className="usa-sidenav">
            <li>
              <NavLink to="/staffing/dashboard">
                <Icon name="dashboard" color={COLOR_MAIN} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/staffing/resources">
                <Icon name="people" color={COLOR_MAIN} />
                Resources
              </NavLink>
            </li>
            <li>
              <NavLink to="/staffing/requests">
                <Icon name="pending_actions" color={COLOR_MAIN} />
                Resource Requests
              </NavLink>
            </li>
          </ul>
        </div>

        {user?.role === 'admin' && (
          <div className="sidenav-section">
            <div className="sidenav-section-label">Admin</div>
            <ul className="usa-sidenav">
              <li>
                <NavLink to="/admin/import">
                  <Icon name="file_upload" color={COLOR_ADMIN} />
                  Import Data
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/reference-data">
                  <Icon name="settings" color={COLOR_ADMIN} />
                  Reference Data
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/users">
                  <Icon name="group_add" color={COLOR_ADMIN} />
                  Users
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/audit-log">
                  <Icon name="history" color={COLOR_ADMIN} />
                  Audit Log
                </NavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

    </aside>
  );
}
