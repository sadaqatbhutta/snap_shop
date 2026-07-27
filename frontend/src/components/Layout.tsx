import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, MessageSquare, Users, Settings, LogOut,
  Bot, TrendingUp, Megaphone, User, ChevronDown, KeyRound, AlertTriangle, RefreshCw, Shield,
  BookOpen, GitBranch, FileStack, Filter, Menu, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logout } from '../services/authService';
import { auth } from '../firebase';
import { scaleIn } from '../lib/animations';
import { useBusiness } from '../context/BusinessContext';

interface LayoutProps {
  children: React.ReactNode;
}

type NavItem = { icon: React.ComponentType<{ className?: string }>; label: string; path: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Inbox',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/app' },
      { icon: MessageSquare, label: 'Conversations', path: '/app/conversations' },
      { icon: Users, label: 'CRM', path: '/app/crm' },
    ],
  },
  {
    label: 'Growth',
    items: [
      { icon: Megaphone, label: 'Broadcasts', path: '/app/broadcasts' },
      { icon: FileStack, label: 'Templates', path: '/app/templates' },
      { icon: Filter, label: 'Segments', path: '/app/segments' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: Bot, label: 'AI Settings', path: '/app/ai-settings' },
      { icon: BookOpen, label: 'Knowledge', path: '/app/knowledge' },
      { icon: GitBranch, label: 'Workflows', path: '/app/workflows' },
      { icon: TrendingUp, label: 'Analytics', path: '/app/analytics' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', path: '/app/settings' },
      { icon: Shield, label: 'Admin', path: '/app/admin' },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const user = auth.currentUser;
  const { business, dataStatus, lastError, refreshBusiness } = useBusiness();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [retryingData, setRetryingData] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname]);

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

  const flatItems = NAV_GROUPS.flatMap(g => g.items);
  const pageLabel = flatItems.find(item =>
    item.path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.path)
  )?.label || 'SnapShop';

  const NavLinks = () => (
    <>
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-1">
          <p className="nav-group-label">{group.label}</p>
          <div className="space-y-0.5 px-2">
            {group.items.map(item => {
              const isActive = item.path === '/app'
                ? location.pathname === '/app'
                : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-[0.75rem]',
                    isActive ? 'nav-active' : 'text-[var(--ink-soft)] hover:bg-white/80 hover:text-[var(--ink)]'
                  )}
                >
                  <item.icon className={cn('w-4 h-4', isActive ? 'text-[var(--accent-bright)]' : 'text-slate-400')} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="mesh-orb -top-20 -left-12 h-80 w-80 bg-[var(--accent)]/25" />
        <div className="mesh-orb bottom-0 right-1/4 h-72 w-72 bg-slate-400/10 [animation-delay:1.4s]" />
      </div>

      {/* Desktop sidebar */}
      <motion.aside
        className="relative z-20 hidden lg:flex w-[16.25rem] shell-sidebar flex-col"
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="px-5 pt-6 pb-3">
          <Link to="/app" className="block group">
            <p className="font-display brand-mark text-[1.7rem] leading-none text-[var(--ink)] group-hover:text-[var(--accent-deep)]">
              SnapShop
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="status-dot" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--ink-soft)]">
                AI online
              </p>
            </div>
          </Link>
          {business?.name && (
            <p className="mt-4 text-xs font-semibold text-[var(--ink)] truncate rounded-[0.7rem] px-3 py-2.5 bg-white/70 border border-[var(--line)]">
              {business.name}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto pb-3 pt-1">
          <NavLinks />
        </nav>

        <div className="p-3 border-t border-[var(--line)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-rose-700 rounded-[0.75rem] hover:bg-rose-50 w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-[var(--ink)]/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[17rem] shell-sidebar flex flex-col lg:hidden shadow-2xl"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <p className="font-display brand-mark text-xl">SnapShop</p>
                <button type="button" onClick={() => setMobileNav(false)} className="p-2 rounded-lg hover:bg-white/80">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto pb-4">
                <NavLinks />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex-1 overflow-y-auto flex flex-col min-w-0">
        <header className="h-15 min-h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 sticky top-0 z-20 shell-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl border border-[var(--line)] bg-white/80"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="page-eyebrow truncate">Workspace</p>
              <h2 className="section-title text-lg sm:text-xl leading-tight truncate">{pageLabel}</h2>
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
              className="flex items-center gap-2.5 sm:gap-3 px-2 py-1.5 rounded-xl hover:bg-white border border-transparent hover:border-[var(--line)]"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[var(--ink)] leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 leading-tight">{user?.email || ''}</p>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-xl border border-[var(--line)]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[var(--ink)] text-white flex items-center justify-center font-bold text-sm">
                  {initials}
                </div>
              )}
              <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform hidden sm:block', profileOpen && 'rotate-180')} />
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
                  <div className="p-4 border-b border-[var(--line)] bg-[var(--ink)] text-white">
                    <p className="text-sm font-bold truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-white/60 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/app/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 rounded-xl hover:bg-slate-50">
                      <User className="w-4 h-4 text-slate-500" />
                      Profile & Settings
                    </Link>
                    <Link to="/app/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 rounded-xl hover:bg-slate-50">
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

        <div className="p-4 sm:p-6 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
