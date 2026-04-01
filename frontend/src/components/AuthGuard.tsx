/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User, sendEmailVerification } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail, logout } from '../services/authService';
import { Bot, LogIn, Mail, Lock, ArrowRight, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, Sparkles, Users, MessageSquare, User as UserIcon, RefreshCw, Send, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

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
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-white font-sans text-gray-900">
        <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-12">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Bot className="w-8 h-8" /></div>
              <span className="text-2xl font-bold tracking-tight text-white">SnapShop AI</span>
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-md">
              <h2 className="text-5xl font-bold text-white leading-tight mb-6">Automate your sales with AI intelligence.</h2>
              <p className="text-indigo-100 text-lg leading-relaxed">Connect with customers, manage segments, and scale with broadcasts.</p>
            </motion.div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">{isLogin ? 'Welcome back' : 'Get started today'}</h1>
              <p className="text-gray-500">{isLogin ? 'Enter your credentials to access your dashboard.' : 'Join thousands of businesses scaling with SnapShop AI.'}</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-sm text-red-600">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
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
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
              </div>
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">What is {captchaQuestion}?</label>
                    <input type="number" required value={captchaInput} onChange={e => setCaptchaInput(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" />
                  </div>
                </>
              )}
              <button type="submit" disabled={authLoading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <button onClick={handleGoogleLogin} disabled={authLoading} className="w-full flex items-center justify-center gap-3 py-4 border border-gray-200 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all font-sans">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>

            <div className="text-center pt-4">
              <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-sm font-bold text-gray-500 hover:text-indigo-600">
                {isLogin ? <>Don't have an account? <span className="text-indigo-600">Sign up</span></> : <>Already have an account? <span className="text-indigo-600">Sign in</span></>}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex bg-white font-sans text-gray-900">
        <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-12">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Bot className="w-8 h-8" /></div>
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
