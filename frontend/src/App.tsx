import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import { BusinessProvider } from './context/BusinessContext';
import { pageTransition } from './lib/animations';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Broadcasts = lazy(() => import('./pages/Broadcasts'));
const Templates = lazy(() => import('./pages/Templates'));
const Segments = lazy(() => import('./pages/Segments'));
const AISettings = lazy(() => import('./pages/AISettings'));
const CRM = lazy(() => import('./pages/CRM'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Join = lazy(() => import('./pages/Join'));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Dashboard />
          </motion.div>
        } />
        <Route path="/conversations" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Conversations />
          </motion.div>
        } />
        <Route path="/broadcasts" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Broadcasts />
          </motion.div>
        } />
        <Route path="/templates" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Templates />
          </motion.div>
        } />
        <Route path="/segments" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Segments />
          </motion.div>
        } />
        <Route path="/crm" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <CRM />
          </motion.div>
        } />
        <Route path="/ai-settings" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <AISettings />
          </motion.div>
        } />
        <Route path="/analytics" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Analytics />
          </motion.div>
        } />
        <Route path="/settings" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Settings />
          </motion.div>
        } />
        <Route path="/join" element={
          <motion.div className="w-full" initial="initial" animate="animate" exit="exit" variants={pageTransition}>
            <Join />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white/70 p-6 text-sm text-gray-500">
      Loading page...
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthGuard>
        <BusinessProvider>
          <Layout>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AnimatedRoutes />
            </Suspense>
          </Layout>
        </BusinessProvider>
      </AuthGuard>
    </Router>
  );
}
