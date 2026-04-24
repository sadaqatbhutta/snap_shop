/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { User, sendEmailVerification } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail, logout, resetPassword } from '../services/authService';
import { Bot, LogIn, Mail, Lock, ArrowRight, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, Sparkles, Users, MessageSquare, User as UserIcon, RefreshCw, Send, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { AuthScreenSkeleton } from './Skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

const mapAuthError = (message: string) => {
  if (message.includes('auth/invalid-credential')) return 'Invalid email or password. Please try again.';
  if (message.includes('auth/user-not-found')) return 'No account found with this email.';
  if (message.includes('auth/wrong-password')) return 'Incorrect password. Please try again.';
  if (message.includes('auth/email-already-in-use')) return 'An account already exists with this email.';
  if (message.includes('auth/weak-password')) return 'Password should be at least 6 characters.';
  if (message.includes('auth/invalid-email')) return 'Please enter a valid email address.';
  if (message.includes('auth/too-many-requests')) return 'Too many unsuccessful login attempts. Please try again later.';
  if (message.includes('auth/operation-not-allowed')) return 'This sign-in method is currently disabled.';
  if (message.includes('auth/popup-closed-by-user')) return 'The login popup was closed before completion.';
  if (message.includes('auth/user-disabled')) return 'This account has been disabled.';
  return message;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const hidePasswordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showFirstVisitIntro, setShowFirstVisitIntro] = useState(false);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    setCaptchaQuestion(`${num1} + ${num2}`);
    setCaptchaAnswer(num1 + num2);
    setCaptchaInput('');
  };

  useEffect(() => {
    if (!isLogin) generateCaptcha();
  }, [isLogin]);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('snapshop-auth-intro-seen');
    if (!seen) {
      setShowFirstVisitIntro(true);
      localStorage.setItem('snapshop-auth-intro-seen', '1');
      const timer = setTimeout(() => setShowFirstVisitIntro(false), 2200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (hidePasswordTimeoutRef.current) {
        clearTimeout(hidePasswordTimeoutRef.current);
      }
    };
  }, []);

  const revealPasswordTemporarily = () => {
    setShowPassword(true);
    if (hidePasswordTimeoutRef.current) {
      clearTimeout(hidePasswordTimeoutRef.current);
    }
    hidePasswordTimeoutRef.current = setTimeout(() => {
      setShowPassword(false);
      hidePasswordTimeoutRef.current = null;
    }, 3000);
  };

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setRefreshing(true);
    try {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    } catch (err) {
      console.error('Failed to reload user:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser || resendCooldown > 0) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setResendCooldown(60);
      alert('Verification email sent!');
    } catch (err) {
      setError('Failed to resend verification email.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setAuthLoading(true);
    try {
      const normalizedEmail = email.trim();
      if (isLogin) {
        await loginWithEmail(normalizedEmail, password);
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (Number.parseInt(captchaInput, 10) !== captchaAnswer) {
          generateCaptcha();
          throw new Error('Incorrect captcha answer.');
        }
        const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
        await registerWithEmail(normalizedEmail, password, displayName);
      }
    } catch (err: any) {
      if (!isLogin) {
        // On any signup failure, rotate captcha and require a fresh answer.
        generateCaptcha();
      }
      setError(mapAuthError(err.message));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(mapAuthError(err.message));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetSent(false);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email first, then click Forgot Password.');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(normalizedEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(mapAuthError(err.message));
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return <AuthScreenSkeleton />;
  }

  if (!user) {
    return (
      <motion.div
        className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-indigo-50 font-sans text-gray-900 relative overflow-hidden"
        initial={{ opacity: 0, scale: 1.01 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />

        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/auth-bg.svg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/35 via-indigo-800/25 to-violet-800/35" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-[34rem] h-[34rem] bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-12">
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md overflow-hidden">
                <img src="/favicon.png" className="w-8 h-8 object-cover" alt="SnapShop AI logo" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">SnapShop AI</span>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-indigo-50 text-xs font-semibold tracking-wide mb-6 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                AI-First Sales Workspace
              </div>
              <h2 className="text-5xl font-bold text-white leading-tight mb-6">The modern inbox for AI-powered customer sales.</h2>
              <p className="text-indigo-100 text-lg leading-relaxed">
                Reply faster, automate campaigns, and convert more leads with one intelligent dashboard.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  'Smart reply suggestions',
                  'Broadcast + segmentation',
                  'Team inbox collaboration',
                  'Multi-channel webhooks',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-indigo-50/95">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(79,70,229,0.35)] p-7 sm:p-8 space-y-7"
          >
            <div className="text-center lg:text-left">
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-indigo-500 mb-2">Secure Access</p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                {isLogin ? 'Welcome back' : 'Create your AI workspace'}
              </h1>
              <p className="text-gray-500">
                {isLogin
                  ? 'Sign in to continue your sales automation workflow.'
                  : 'Join teams using AI to grow customer conversations and revenue.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-sm text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {resetSent && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-sm text-green-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">Password reset email sent. Please check your inbox.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleEmailAuth} className="space-y-5">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">First Name</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Last Name</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={revealPasswordTemporarily}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-4 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={revealPasswordTemporarily}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">What is {captchaQuestion}?</label>
                    <input type="number" required value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                  </div>
                </>
              )}
              <motion.button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {authLoading ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                {isLogin ? 'Sign In' : 'Create Account'}
              </motion.button>
              {isLogin && (
                <motion.button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || authLoading}
                  className="w-full text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {resetLoading ? 'Sending reset email...' : 'Forgot Password?'}
                </motion.button>
              )}
            </form>

            <motion.button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-4 border border-gray-200 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all font-sans"
              whileHover={{ y: -1, scale: 1.005 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </motion.button>

            <div className="text-center pt-2">
              <motion.button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-sm font-bold text-gray-500 hover:text-indigo-600"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLogin ? <>Don't have an account? <span className="text-indigo-600">Sign up</span></> : <>Already have an account? <span className="text-indigo-600">Sign in</span></>}
              </motion.button>
            </div>
          </motion.div>
        </div>
        <AnimatePresence>
          {showFirstVisitIntro && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center text-white"
              >
                <motion.div
                  className="mx-auto mb-5 p-4 bg-white/20 rounded-3xl backdrop-blur-md w-fit"
                  animate={{ rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img src="/favicon.png" className="w-10 h-10 object-cover" alt="SnapShop AI logo" />
                </motion.div>
                <h2 className="text-3xl font-black tracking-tight">SnapShop AI</h2>
                <p className="text-indigo-100 mt-2 text-sm">Preparing your AI sales workspace...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex bg-white font-sans text-gray-900">
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/auth-bg.svg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/35 via-indigo-800/25 to-violet-800/35" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-12">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md overflow-hidden">
                <img src="/favicon.png" className="w-8 h-8 object-cover" alt="Logo" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SnapShop AI</span>
            </div>
            <div className="max-w-md">
              <h2 className="text-5xl font-bold text-white leading-tight mb-6">Verify your email.</h2>
              <p className="text-indigo-100 text-lg leading-relaxed">Identity verification secures your platform and business data.</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
            <div className="flex justify-center"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center"><Mail className="w-10 h-10" /></div></div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-gray-900">Confirm your address</h1>
              <p className="text-gray-500">We sent a verification link to <span className="font-bold text-gray-900">{user.email}</span></p>
            </div>
            <div className="space-y-4 pt-4">
              <button onClick={handleRefresh} disabled={refreshing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {refreshing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                I've Verified My Email
              </button>
              <button onClick={handleResend} disabled={resendCooldown > 0} className="w-full py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
              </button>
            </div>
            <div className="pt-6 border-t border-gray-100">
              <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-600 flex items-center gap-2 mx-auto"><LogOut className="w-4 h-4" /> Sign out</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
