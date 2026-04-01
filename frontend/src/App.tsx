import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Broadcasts from './pages/Broadcasts';
import Templates from './pages/Templates';
import Segments from './pages/Segments';
import AISettings from './pages/AISettings';
import CRM from './pages/CRM';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Join from './pages/Join';
import AuthGuard from './components/AuthGuard';
import { BusinessProvider } from './context/BusinessContext';

export default function App() {
  return (
    <Router>
      <AuthGuard>
        <BusinessProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/broadcasts" element={<Broadcasts />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/segments" element={<Segments />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/ai-settings" element={<AISettings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/join" element={<Join />} />
            </Routes>
          </Layout>
        </BusinessProvider>
      </AuthGuard>
    </Router>
  );
}
