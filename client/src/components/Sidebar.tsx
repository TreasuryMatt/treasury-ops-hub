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
          <div className="sidenav-section-label">Staffing</div>
          <ul className="usa-sidenav">
            <li>
              <NavLink to="/dashboard">
                <Icon name="dashboard" color={COLOR_MAIN} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/resources">
                <Icon name="people" color={COLOR_MAIN} />
                Resources
              </NavLink>
            </li>
            <li>
              <NavLink to="/projects">
                <Icon name="work" color={COLOR_MAIN} />
                Projects
              </NavLink>
            </li>
          </ul>
        </div>

        {(user?.role === 'editor' || user?.role === 'admin') && (
          <div className="sidenav-section">
            <div className="sidenav-section-label">Manage</div>
            <ul className="usa-sidenav">
              <li>
                <NavLink to="/resources/new">
                  <Icon name="person_add" color={COLOR_MAIN} />
                  Add Resource
                </NavLink>
              </li>
              <li>
                <NavLink to="/projects/new">
                  <Icon name="add" color={COLOR_MAIN} />
                  Add Project
                </NavLink>
              </li>
            </ul>
          </div>
        )}

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

      <div className="sidenav-footer">
        <div className="font-bold text-xs" style={{ color: 'var(--usa-base-darkest)', marginBottom: 2 }}>
          {user?.displayName}
        </div>
        <div className="text-xs">{user?.role}</div>
      </div>
    </aside>
  );
}
