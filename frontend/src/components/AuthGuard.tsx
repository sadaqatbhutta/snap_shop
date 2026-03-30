/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, loginWithGoogle, loginWithEmail, registerWithEmail } from '../services/authService';
import { Bot, LogIn, Mail, Lock, ArrowRight, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, Sparkles, Users, MessageSquare, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    setCaptchaQuestion(`${num1} + ${num2}`);
    setCaptchaAnswer(num1 + num2);
    setCaptchaInput('');
  };

  useEffect(() => {
    if (!isLogin) {
      generateCaptcha();
    }
  }, [isLogin]);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthLoading(true);
    try {
      const normalizedEmail = email.trim();
      if (isLogin) {
        await loginWithEmail(normalizedEmail, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        if (Number.parseInt(captchaInput, 10) !== captchaAnswer) {
          generateCaptcha();
          throw new Error('Incorrect captcha answer. Please try again.');
        }
        const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
        await registerWithEmail(normalizedEmail, password, displayName);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(mapAuthError(message || 'Authentication failed.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(mapAuthError(message || 'Google login failed.'));
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
        {/* Left Side: Hero/Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white mb-12">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Bot className="w-8 h-8" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SnapShop AI</span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-md"
            >
              <h2 className="text-5xl font-bold text-white leading-tight mb-6">
                Automate your sales with AI intelligence.
              </h2>
              <p className="text-indigo-100 text-lg leading-relaxed">
                Connect with customers across all channels, manage segments with precision, and scale your business with automated broadcasts.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-6">
            {[
              { icon: Sparkles, text: "AI Powered Insights" },
              { icon: CheckCircle2, text: "Multi-channel Support" },
              { icon: Users, text: "Smart Segmentation" },
              { icon: MessageSquare, text: "Automated Broadcasts" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-indigo-100">
                <item.icon className="w-5 h-5 opacity-70" />
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center lg:text-left">
              <div className="lg:hidden flex justify-center mb-6">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                  <Bot className="w-10 h-10" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                {isLogin ? 'Welcome back' : 'Get started today'}
              </h1>
              <p className="text-gray-500">
                {isLogin 
                  ? 'Enter your credentials to access your dashboard.' 
                  : 'Join thousands of businesses scaling with SnapShop AI.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-sm text-red-600"
                >
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
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input 
                        type="text" 
                        required
                        placeholder="John"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Last Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input 
                        type="text" 
                        required
                        placeholder="Doe"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="email" 
                    required
                    placeholder="name@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  {isLogin && (
                    <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Captcha: What is {captchaQuestion}?</label>
                    <div className="relative group">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input 
                        type="number" 
                        required
                        placeholder="Enter result"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit"
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {authLoading ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-4 text-gray-400 font-bold tracking-widest">Or continue with</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 border border-gray-200 bg-white text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>

            <div className="text-center pt-4">
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setFirstName('');
                  setLastName('');
                  setConfirmPassword('');
                  setCaptchaInput('');
                }}
                className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-indigo-600">Sign up for free</span></>
                ) : (
                  <>Already have an account? <span className="text-indigo-600">Sign in here</span></>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              By continuing, you agree to SnapShop AI's <br />
              <a href="#" className="underline hover:text-gray-600">Terms of Service</a> and <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
