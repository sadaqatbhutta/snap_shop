import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, MessageSquare, Users, Settings, LogOut,
  Bot, TrendingUp, Megaphone, User, ChevronDown, KeyRound
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logout } from '../services/authService';
import { auth } from '../firebase';
import { scaleIn } from '../lib/animations';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',     path: '/' },
    { icon: MessageSquare,   label: 'Conversations', path: '/conversations' },
    { icon: Megaphone,       label: 'Broadcasts',    path: '/broadcasts' },
    { icon: Users,           label: 'CRM',           path: '/crm' },
    { icon: Bot,             label: 'AI Settings',   path: '/ai-settings' },
    { icon: TrendingUp,      label: 'Analytics',     path: '/analytics' },
    { icon: Settings,        label: 'Settings',      path: '/settings' },
  ];

  // Close dropdown when clicking outside
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

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        className="w-64 bg-white border-r border-gray-200 flex flex-col"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          className="p-6"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <Bot className="w-8 h-8" />
            SnapShop
          </h1>
        </motion.div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors relative',
                    isActive
                      ? 'text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 bg-indigo-50 rounded-lg -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <motion.button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 w-full transition-colors"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find(item => item.path === location.pathname)?.label || 'SnapShop'}
          </h2>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 leading-tight">{user?.email || ''}</p>
              </div>

              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-9 h-9 rounded-full border-2 border-gray-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {initials}
                </div>
              )}
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', profileOpen && 'rotate-180')} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={scaleIn}
                  style={{ transformOrigin: 'top right' }}
                >
                {/* User Info Header */}
                <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                  <div className="flex items-center gap-3">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white shadow" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Profile & Settings
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-gray-500" />
                    Change Password
                  </Link>
                </div>

                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
