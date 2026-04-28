import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout, AdminOnly, EditorOnly, IntakeReviewerOnly } from './components/AppLayout';
import { IntakePortalLayout } from './components/IntakePortalLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { ResourceForm } from './pages/ResourceForm';
import { ResourceRequests } from './pages/ResourceRequests';
import { ResourceRequestForm } from './pages/ResourceRequestForm';
import { Import } from './pages/admin/Import';
import { ReferenceData } from './pages/admin/ReferenceData';
import { Users } from './pages/admin/Users';
import { AuditLog } from './pages/admin/AuditLog';
import { StatusDashboard } from './pages/status/StatusDashboard';
import { StatusProjects } from './pages/status/StatusProjects';
import { StatusProjectDetail } from './pages/status/StatusProjectDetail';
import { StatusProjectForm } from './pages/status/StatusProjectForm';
import { Programs } from './pages/status/Programs';
import { Applications } from './pages/status/Applications';
import { ProgramDetail } from './pages/status/ProgramDetail';
import { ProgramForm } from './pages/status/ProgramForm';
import { ApplicationForm } from './pages/status/ApplicationForm';
import { Roadmap } from './pages/status/Roadmap';
import { Reports } from './pages/status/Reports';
import { ExecutiveRollup } from './pages/status/ExecutiveRollup';
import { Notifications } from './pages/Notifications';
import { NotificationPreferences } from './pages/NotificationPreferences';
import { IntakeCustomerHome } from './pages/intake/IntakeCustomerHome';
import { IntakeSubmissionForm } from './pages/intake/IntakeSubmissionForm';
import { IntakeReviewerDashboard } from './pages/intake/IntakeReviewerDashboard';
import { IntakeReviewerQueue } from './pages/intake/IntakeReviewerQueue';
import { IntakeReviewerDetail } from './pages/intake/IntakeReviewerDetail';
import { Risks } from './pages/risks/Risks';
import { RiskForm } from './pages/risks/RiskForm';
import { RiskDetail } from './pages/risks/RiskDetail';
import { Issues } from './pages/risks/Issues';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/intake" element={<IntakePortalLayout />}>
              <Route index element={<IntakeCustomerHome />} />
              <Route path="new" element={<IntakeSubmissionForm />} />
              <Route path=":id" element={<IntakeSubmissionForm />} />
            </Route>

            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/staffing/dashboard" replace />} />
              <Route path="staffing/dashboard" element={<Dashboard />} />
              <Route path="staffing/resources" element={<Resources />} />
              <Route path="staffing/resources/:id" element={<ResourceDetail />} />
              <Route path="staffing/requests" element={<ResourceRequests />} />
              <Route path="staffing/requests/new" element={<ResourceRequestForm />} />
              {/* Legacy redirects */}
              <Route path="dashboard" element={<Navigate to="/staffing/dashboard" replace />} />
              <Route path="resources" element={<Navigate to="/staffing/resources" replace />} />
              <Route path="resources/:id" element={<Navigate to="/staffing/resources" replace />} />
              <Route path="requests" element={<Navigate to="/staffing/requests" replace />} />
              <Route path="projects" element={<Navigate to="/status/projects" replace />} />
              <Route path="projects/:id" element={<Navigate to="/status/projects" replace />} />

              {/* Project Status */}
              <Route path="status/dashboard" element={<StatusDashboard />} />
              <Route path="status/projects" element={<StatusProjects />} />
              <Route path="status/projects/:id" element={<StatusProjectDetail />} />
              <Route path="status/programs" element={<Programs />} />
              <Route path="status/applications" element={<Applications />} />
              <Route path="status/programs/:id" element={<ProgramDetail />} />
              <Route path="status/roadmap" element={<Roadmap />} />
              <Route path="status/reports" element={<Reports />} />
              <Route path="risks/risks" element={<Risks />} />
              <Route path="risks/risks/new" element={<RiskForm />} />
              <Route path="risks/risks/:id" element={<RiskDetail />} />
              <Route path="risks/issues" element={<Issues />} />
              {/* Executive */}
              <Route path="exec/summary" element={<ExecutiveRollup />} />
              <Route path="exec/rollup" element={<Navigate to="/exec/summary" replace />} />
              <Route path="status/rollup" element={<Navigate to="/exec/summary" replace />} />

              {/* Notifications */}
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings/notifications" element={<NotificationPreferences />} />

              <Route element={<IntakeReviewerOnly />}>
                <Route path="intake/review" element={<IntakeReviewerDashboard />} />
                <Route path="intake/review/submissions" element={<IntakeReviewerQueue />} />
                <Route path="intake/review/submissions/:id" element={<IntakeReviewerDetail />} />
              </Route>

              {/* Editor + Admin */}
              <Route element={<EditorOnly />}>
                <Route path="staffing/resources/new" element={<ResourceForm />} />
                <Route path="staffing/resources/:id/edit" element={<ResourceForm />} />
                <Route path="status/projects/new" element={<StatusProjectForm />} />
                <Route path="status/projects/:id/edit" element={<StatusProjectForm />} />
                <Route path="status/programs/new" element={<ProgramForm />} />
                <Route path="status/programs/:id/edit" element={<ProgramForm />} />
                <Route path="status/applications/new" element={<ApplicationForm />} />
                <Route path="status/applications/:id/edit" element={<ApplicationForm />} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminOnly />}>
                <Route path="admin/import" element={<Import />} />
                <Route path="admin/reference-data" element={<ReferenceData />} />
                <Route path="admin/users" element={<Users />} />
                <Route path="admin/audit-log" element={<AuditLog />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/staffing/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
