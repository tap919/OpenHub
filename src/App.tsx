import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { RepoLayout } from './pages/RepoLayout';
import { CodeView } from './pages/CodeView';
import { IssuesView } from './pages/IssuesView';
import { PullsView } from './pages/PullsView';
import { ActionsView } from './pages/ActionsView';
import { ProjectsView } from './pages/ProjectsView';
import { WikiView } from './pages/WikiView';
import { CommitsView } from './pages/CommitsView';
import { ExtensionsView } from './pages/ExtensionsView';
import { ToolkitRegistry } from './pages/ToolkitRegistry';
import { UserSettingsView } from './pages/UserSettingsView';
import { BusinessOpsView } from './pages/BusinessOpsView';
import { AutonomousPipelines } from './pages/AutonomousPipelines';
import { IntegrationsHub } from './pages/IntegrationsHub';
import { SettingsView } from './pages/SettingsView';
import { WorkspacePage } from './ide/WorkspacePage';
import { StudioPage } from './ide/StudioPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div data-loading="auth" className="min-h-screen flex items-center justify-center" style={{ background: '#0A0C10' }}><div className="text-gray-400">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0C10' }}>
        <div className="text-gray-400 font-mono text-sm">Starting OpenHub...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="registry" element={<ToolkitRegistry />} />
        <Route path="business" element={<BusinessOpsView />} />
        <Route path="autonomous" element={<AutonomousPipelines />} />
        <Route path="integrations" element={<IntegrationsHub />} />
        <Route path="settings" element={<UserSettingsView />} />
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="workspace/:owner/:repo" element={<WorkspacePage />} />
        <Route path="studio" element={<StudioPage />} />
        <Route path=":owner/:repo" element={<RepoLayout />}>
          <Route index element={<CodeView />} />
          <Route path="commits" element={<CommitsView />} />
          <Route path="issues" element={<IssuesView />} />
          <Route path="pulls" element={<PullsView />} />
          <Route path="actions" element={<ActionsView />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="wiki" element={<WikiView />} />
          <Route path="extensions" element={<ExtensionsView />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
