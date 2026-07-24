import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, MessageSquare, Users, Settings, LogOut,
  Bot, TrendingUp, Megaphone, User, ChevronDown, KeyRound, AlertTriangle, RefreshCw, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logout } from '../services/authService';
import { auth } from '../firebase';
import { scaleIn } from '../lib/animations';
import { useBusiness } from '../context/BusinessContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const user = auth.currentUser;
  const { business, dataStatus, lastError, refreshBusiness } = useBusiness();
  const [profileOpen, setProfileOpen] = useState(false);
  const [retryingData, setRetryingData] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
    { icon: Megaphone, label: 'Broadcasts', path: '/broadcasts' },
    { icon: Users, label: 'CRM', path: '/crm' },
    { icon: Bot, label: 'AI Settings', path: '/ai-settings' },
    { icon: TrendingUp, label: 'Analytics', path: '/analytics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Shield, label: 'Admin', path: '/admin' },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
  };

  const handleRetryData = async () => {
    setRetryingData(true);
    try {
      await refreshBusiness();
    } finally {
      setRetryingData(false);
    }
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const pageLabel = navItems.find(item => item.path === location.pathname)?.label || 'SnapShop';

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="mesh-orb -top-16 -left-10 h-72 w-72 bg-teal-300/30" />
        <div className="mesh-orb bottom-0 right-1/4 h-80 w-80 bg-slate-400/15 [animation-delay:1.4s]" />
        <div className="mesh-orb top-1/3 -right-20 h-64 w-64 bg-teal-500/15 [animation-delay:0.7s]" />
      </div>

      <motion.aside
        className="relative z-10 w-[16.5rem] border-r border-[var(--line)] bg-white/55 backdrop-blur-xl flex flex-col"
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="px-5 pt-6 pb-4">
          <Link to="/" className="block group">
            <p className="font-display brand-mark text-[1.85rem] leading-none text-[var(--ink)] group-hover:text-[var(--accent-deep)] transition-colors">
              SnapShop
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] font-semibold text-teal-800/70">
              AI workspace
            </p>
          </Link>
          {business?.name && (
            <p className="mt-4 text-xs text-[var(--ink-soft)] truncate border border-[var(--line)] rounded-xl px-3 py-2 bg-white/60">
              {business.name}
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-colors',
                  isActive ? 'nav-active' : 'text-slate-600 hover:bg-white/70 hover:text-[var(--ink)]'
                )}
              >
                <item.icon className={cn('w-4.5 h-4.5', isActive ? 'text-teal-700' : 'text-slate-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--line)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium text-rose-700 rounded-xl hover:bg-rose-50 w-full"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign out
          </button>
        </div>
      </motion.aside>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10 bg-white/55 backdrop-blur-xl border-b border-[var(--line)]">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-teal-800/60">Workspace</p>
              <h2 className="font-display text-xl text-[var(--ink)] leading-tight">{pageLabel}</h2>
            </div>
            {dataStatus === 'degraded' && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Sync delayed
                <button
                  type="button"
                  onClick={handleRetryData}
                  disabled={retryingData}
                  className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 hover:bg-amber-100 disabled:opacity-60"
                  title={lastError || 'Retry data sync'}
                >
                  <RefreshCw className={cn('w-3 h-3', retryingData && 'animate-spin')} />
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl hover:bg-white/80 border border-transparent hover:border-[var(--line)]"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-[var(--ink)] leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 leading-tight">{user?.email || ''}</p>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-xl border border-[var(--line)]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center font-semibold text-sm">
                  {initials}
                </div>
              )}
              <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', profileOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[var(--line)] bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden z-50"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={scaleIn}
                  style={{ transformOrigin: 'top right' }}
                >
                  <div className="p-4 border-b border-[var(--line)] bg-gradient-to-br from-teal-50 to-white">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 rounded-xl hover:bg-slate-50">
                      <User className="w-4 h-4 text-slate-500" />
                      Profile & Settings
                    </Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 rounded-xl hover:bg-slate-50">
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      Change Password
                    </Link>
                  </div>
                  <div className="p-2 border-t border-[var(--line)]">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-rose-700 rounded-xl hover:bg-rose-50 w-full">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
