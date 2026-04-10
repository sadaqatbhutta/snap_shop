import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthChange } from '../services/authService';
import { CheckCircle2, AlertCircle, Sparkles, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { JoinSkeleton } from '../components/Skeleton';

export default function Join() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthorized'>('loading');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        setStatus('unauthorized');
        return;
      }
      if (!token) {
        setStatus('error');
        setError('Missing invitation token.');
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const resp = await fetch('/api/team/accept', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ token }),
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || 'Failed to accept invitation');
        
        setStatus('success');
        setTimeout(() => navigate('/'), 3000);
      } catch (err: any) {
        setStatus('error');
        setError(err.message);
      }
    });

    return () => unsub();
  }, [token, navigate]);

  return (
    <>
      {status === 'loading' && <JoinSkeleton />}
      {status !== 'loading' && (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg">
            <Bot className="w-10 h-10" />
          </div>
        </div>

        {status === 'unauthorized' && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto" />
            <h1 className="text-2xl font-black text-gray-900">Sign in Required</h1>
            <p className="text-gray-500">You must be signed in to accept an invitation. Please log in then follow the link again.</p>
            <button onClick={() => navigate('/')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all">
              Go to Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Welcome to the Team!</h1>
            <p className="text-gray-500 font-medium">You have successfully joined the business. Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h1 className="text-2xl font-black text-gray-900">Invalid Invitation</h1>
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={() => navigate('/')} className="w-full py-4 border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all">
              Back to Safety
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-gray-50">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Powered by SnapShop AI
          </p>
        </div>
      </motion.div>
    </div>
      )}
    </>
  );
}
