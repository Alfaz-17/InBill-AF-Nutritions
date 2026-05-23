'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application runtime error:', error);
  }, [error]);

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          {isOffline ? <WifiOff size={24} /> : <AlertTriangle size={24} />}
        </div>
        <h1 className="text-xl font-black text-slate-900">
          {isOffline ? 'No Internet Connection' : 'Something needs a refresh'}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {isOffline
            ? 'Your data is safe. Please reconnect to use online actions like PDF download, WhatsApp sharing, and cloud sync.'
            : 'The app hit a temporary runtime issue. Refresh this screen and continue from where you left off.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </section>
    </main>
  );
}
