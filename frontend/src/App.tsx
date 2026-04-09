import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
import { pageTransition } from './lib/animations';

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

export default function App() {
  return (
    <Router>
      <AuthGuard>
        <BusinessProvider>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BusinessProvider>
      </AuthGuard>
    </Router>
  );
}
