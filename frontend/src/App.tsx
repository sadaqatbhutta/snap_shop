import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import { BusinessProvider } from './context/BusinessContext';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Broadcasts = lazy(() => import('./pages/Broadcasts'));
const Templates = lazy(() => import('./pages/Templates'));
const Segments = lazy(() => import('./pages/Segments'));
const AISettings = lazy(() => import('./pages/AISettings'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const Workflows = lazy(() => import('./pages/Workflows'));
const CRM = lazy(() => import('./pages/CRM'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Join = lazy(() => import('./pages/Join'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Admin = lazy(() => import('./pages/Admin'));

function RouteLoadingFallback() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white/70 p-6 text-sm text-gray-500">
      Loading page...
    </div>
  );
}

function AppShell() {
  return (
    <AuthGuard>
      <BusinessProvider>
        <Layout>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
        </Layout>
      </BusinessProvider>
    </AuthGuard>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/join" element={<Join />} />

          <Route path="/app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="broadcasts" element={<Broadcasts />} />
            <Route path="templates" element={<Templates />} />
            <Route path="segments" element={<Segments />} />
            <Route path="crm" element={<CRM />} />
            <Route path="ai-settings" element={<AISettings />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/conversations" element={<Navigate to="/app/conversations" replace />} />
          <Route path="/crm" element={<Navigate to="/app/crm" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
