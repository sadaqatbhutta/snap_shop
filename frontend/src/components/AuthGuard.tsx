/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { User, sendEmailVerification } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail, logout, resetPassword } from '../services/authService';
import { LogIn, Mail, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, RefreshCw, Send, LogOut } from 'lucide-react';
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
        className="min-h-screen flex relative overflow-hidden text-[var(--ink)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="mesh-orb -top-20 -left-16 h-80 w-80 bg-teal-300/25 pointer-events-none" />
        <div className="mesh-orb -bottom-24 -right-16 h-80 w-80 bg-slate-400/20 pointer-events-none [animation-delay:1s]" />

        <div className="hidden lg:flex lg:w-[48%] p-12 flex-col justify-between relative overflow-hidden bg-[var(--ink)] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.35),transparent_45%),radial-gradient(circle_at_90%_80%,rgba(148,163,184,0.2),transparent_40%)]" />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('/auth-bg.svg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="relative z-10">
            <p className="font-display text-4xl brand-mark">SnapShop</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-teal-200/80 font-semibold">AI customer workspace</p>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-16 max-w-md">
              <h2 className="font-display text-5xl leading-[1.05] text-white">
                Conversations that think with you.
              </h2>
              <p className="mt-5 text-slate-300 text-base leading-relaxed">
                An AI-native inbox for WhatsApp, Instagram, webchat, and campaigns — built for the pace of modern sales.
              </p>
              <div className="mt-10 space-y-3 text-sm text-slate-200">
                {['Gemini replies with human escalation', 'Broadcasts + segments', 'Usage-aware billing plans'].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          <p className="relative z-10 text-xs text-slate-400">Built for the AI era · SnapShop</p>
        </div>

        <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="w-full max-w-md surface-card p-7 sm:p-8 space-y-6"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-teal-800/70 mb-2">Secure access</p>
              <h1 className="font-display text-3xl text-[var(--ink)] mb-2">
                {isLogin ? 'Welcome back' : 'Start your workspace'}
              </h1>
              <p className="text-slate-500 text-sm">
                {isLogin
                  ? 'Sign in to your AI sales inbox.'
                  : 'Create an account and connect your channels in minutes.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-sm text-rose-700">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {resetSent && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3 text-sm text-teal-800">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">Password reset email sent. Please check your inbox.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">First name</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="input-modern" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Last name</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="input-modern" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-modern" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-modern pr-12"
                  />
                  <button
                    type="button"
                    onClick={revealPasswordTemporarily}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Confirm password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="input-modern pr-12"
                      />
                      <button
                        type="button"
                        onClick={revealPasswordTemporarily}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">What is {captchaQuestion}?</label>
                    <input type="number" required value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="input-modern" />
                  </div>
                </>
              )}
              <motion.button
                type="submit"
                disabled={authLoading}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
                {isLogin ? 'Sign in' : 'Create account'}
              </motion.button>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || authLoading}
                  className="w-full text-sm font-semibold text-teal-800 hover:text-teal-950 disabled:opacity-60"
                >
                  {resetLoading ? 'Sending reset email...' : 'Forgot password?'}
                </button>
              )}
            </form>

            <motion.button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 border border-[var(--line)] bg-white/90 text-[var(--ink)] rounded-xl font-semibold hover:bg-white"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continue with Google
            </motion.button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-sm font-medium text-slate-500 hover:text-teal-800"
              >
                {isLogin ? <>Don&apos;t have an account? <span className="text-teal-800 font-semibold">Sign up</span></> : <>Already have an account? <span className="text-teal-800 font-semibold">Sign in</span></>}
              </button>
            </div>
          </motion.div>
        </div>
        <AnimatePresence>
          {showFirstVisitIntro && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ink)]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.35),transparent_50%)]" />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative text-center text-white"
              >
                <p className="font-display text-5xl brand-mark">SnapShop</p>
                <p className="mt-3 text-sm text-teal-200/90 tracking-wide">Preparing your AI workspace…</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex text-[var(--ink)]">
        <div className="hidden lg:flex lg:w-[48%] p-12 flex-col justify-between relative overflow-hidden bg-[var(--ink)] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.35),transparent_45%)]" />
          <div className="relative z-10">
            <p className="font-display text-4xl brand-mark">SnapShop</p>
            <div className="mt-16 max-w-md">
              <h2 className="font-display text-5xl leading-[1.05] text-white">Verify your email.</h2>
              <p className="mt-5 text-slate-300 text-base leading-relaxed">A quick check keeps your workspace and customer data secure.</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[52%] flex items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md surface-card p-8 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-teal-50 text-teal-800 rounded-2xl flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl">Confirm your address</h1>
              <p className="text-slate-500 text-sm">We sent a verification link to <span className="font-semibold text-[var(--ink)]">{user.email}</span></p>
            </div>
            <div className="space-y-3 pt-2">
              <button onClick={handleRefresh} disabled={refreshing} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60">
                {refreshing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                I&apos;ve verified my email
              </button>
              <button onClick={handleResend} disabled={resendCooldown > 0} className="w-full py-3 border border-[var(--line)] text-slate-600 rounded-xl text-sm font-semibold hover:bg-white/70 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email'}
              </button>
            </div>
            <div className="pt-4 border-t border-[var(--line)]">
              <button onClick={logout} className="text-sm font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-2 mx-auto">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
