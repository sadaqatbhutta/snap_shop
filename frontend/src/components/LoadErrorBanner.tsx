import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function LoadErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="glass-panel glow-border rounded-xl border border-red-100 bg-red-50/80 p-6 text-center space-y-3">
      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}
