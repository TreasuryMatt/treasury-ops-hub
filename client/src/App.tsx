import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout, AdminOnly, EditorOnly } from './components/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { ResourceForm } from './pages/ResourceForm';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ProjectForm } from './pages/ProjectForm';
import { Import } from './pages/admin/Import';
import { ReferenceData } from './pages/admin/ReferenceData';
import { Users } from './pages/admin/Users';
import { AuditLog } from './pages/admin/AuditLog';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="resources" element={<Resources />} />
              <Route path="resources/:id" element={<ResourceDetail />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />

              {/* Editor + Admin */}
              <Route element={<EditorOnly />}>
                <Route path="resources/new" element={<ResourceForm />} />
                <Route path="resources/:id/edit" element={<ResourceForm />} />
                <Route path="projects/new" element={<ProjectForm />} />
                <Route path="projects/:id/edit" element={<ProjectForm />} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminOnly />}>
                <Route path="admin/import" element={<Import />} />
                <Route path="admin/reference-data" element={<ReferenceData />} />
                <Route path="admin/users" element={<Users />} />
                <Route path="admin/audit-log" element={<AuditLog />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
