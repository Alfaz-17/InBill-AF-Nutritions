'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Check, X, AlertTriangle, Info, ShieldAlert, Trash2 } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// Icon mapping for toast types
const TOAST_ICONS = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS = {
  success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', icon: '#10b981', bar: '#10b981' },
  error:   { bg: 'rgba(239, 68, 68, 0.1)',  border: 'rgba(239, 68, 68, 0.25)',  icon: '#ef4444', bar: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', icon: '#f59e0b', bar: '#f59e0b' },
  info:    { bg: 'rgba(14, 165, 233, 0.1)',  border: 'rgba(14, 165, 233, 0.25)',  icon: '#0ea5e9', bar: '#0ea5e9' },
};

const CONFIRM_PRESETS = {
  danger: {
    icon: Trash2,
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: '#ef4444',
    confirmBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    confirmText: 'Delete',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'rgba(245, 158, 11, 0.1)',
    iconColor: '#f59e0b',
    confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    confirmText: 'Confirm',
  },
  info: {
    icon: ShieldAlert,
    iconBg: 'rgba(79, 70, 229, 0.1)',
    iconColor: '#4f46e5',
    confirmBg: 'linear-gradient(135deg, #4f46e5, #3730a3)',
    confirmText: 'Continue',
  },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const toastId = useRef(0);
  const confirmResolve = useRef(null);

  // ── Toast API ──
  const toast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type, removing: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 350);
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 350);
  }, []);

  // ── Confirm API ──
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolve.current = resolve;
      const preset = CONFIRM_PRESETS[options.type || 'warning'];
      setConfirmState({
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || preset.confirmText,
        cancelText: options.cancelText || 'Cancel',
        preset,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmResolve.current) confirmResolve.current(true);
    setConfirmState(null);
    confirmResolve.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    if (confirmResolve.current) confirmResolve.current(false);
    setConfirmState(null);
    confirmResolve.current = null;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ═══ TOAST STACK ═══ */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const colors = TOAST_COLORS[t.type] || TOAST_COLORS.info;
          const Icon = TOAST_ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 20px',
                minWidth: 320,
                maxWidth: 420,
                background: 'var(--bg-card, #fff)',
                border: `1px solid ${colors.border}`,
                borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
                animation: t.removing ? 'toastOut 0.35s forwards' : 'toastIn 0.4s cubic-bezier(0.22,1,0.36,1)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => dismissToast(t.id)}
            >
              {/* Accent bar */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: colors.bar,
                borderRadius: '14px 0 0 14px',
              }} />

              {/* Icon */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: colors.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={17} style={{ color: colors.icon }} />
              </div>

              {/* Message */}
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary, #0f172a)',
                lineHeight: 1.4,
                flex: 1,
              }}>
                {t.message}
              </span>

              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: 2,
                  flexShrink: 0,
                  opacity: 0.5,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.target.style.opacity = '1'}
                onMouseLeave={e => e.target.style.opacity = '0.5'}
              >
                <X size={14} />
              </button>

              {/* Auto-dismiss progress bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: colors.bg,
              }}>
                <div style={{
                  height: '100%',
                  background: colors.bar,
                  borderRadius: '0 0 0 14px',
                  animation: t.removing ? 'none' : 'toastProgress 3.5s linear forwards',
                  opacity: 0.6,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ CONFIRMATION DIALOG ═══ */}
      {confirmState && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            animation: 'fadeIn 0.25s',
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: 'var(--bg-card, #fff)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)',
              animation: 'confirmSlideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with Icon */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 32px 8px',
              gap: 16,
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: confirmState.preset.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <confirmState.preset.icon size={26} style={{ color: confirmState.preset.iconColor }} />
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 800,
                color: 'var(--text-primary, #0f172a)',
                textAlign: 'center',
                letterSpacing: '-0.02em',
                margin: 0,
              }}>
                {confirmState.title}
              </h3>
            </div>

            {/* Message */}
            <div style={{
              padding: '8px 32px 28px',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {confirmState.message}
              </p>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: 12,
              padding: '16px 24px 24px',
              background: 'var(--bg-primary, #f8fafc)',
              borderTop: '1px solid var(--border, #e2e8f0)',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: '13px 20px',
                  borderRadius: 12,
                  border: '1.5px solid var(--border, #e2e8f0)',
                  background: 'var(--bg-card, #fff)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.background = 'var(--bg-primary, #f8fafc)'; e.target.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.target.style.background = 'var(--bg-card, #fff)'; e.target.style.transform = 'none'; }}
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                autoFocus
                style={{
                  flex: 1,
                  padding: '13px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background: confirmState.preset.confirmBg,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)'; }}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(60px) scale(0.95); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes confirmSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
