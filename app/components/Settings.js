'use client';
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Check, Eye, EyeOff, Info, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ configured: false, maskedKey: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    try {
      if (window.electronAPI?.settings) {
        const status = await window.electronAPI.settings.getGeminiKey();
        setKeyStatus(status);
      }
    } catch (e) {
      /* silent */
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (window.electronAPI?.settings) {
        const result = await window.electronAPI.settings.setGeminiKey(apiKey.trim());
        if (result.success) {
          setSaved(true);
          setApiKey('');
          await checkKeyStatus();
          setTimeout(() => setSaved(false), 3000);
        } else {
          setError(result.error || 'Failed to save key');
        }
      }
    } catch (e) {
      setError('Error saving key: ' + e.message);
    }
    setSaving(false);
  };

  const handleSeed = async () => {
    if (!confirm('This will add demo products, sales, and expenses. Continue?')) return;
    setSaving(true);
    try {
      const res = await window.electronAPI.settings.seedData();
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        location.reload(); // Refresh to see data
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your application preferences</p>
      </div>

      {/* API Key Section */}
      <div className="card p-lg mb-lg" style={{ maxWidth: 640 }}>
        <div className="flex items-center gap-md mb-md">
          <div className="metric-icon blue" style={{ width: 40, height: 40, borderRadius: 12 }}>
            <Key size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Google Gemini API</h3>
            <p className="text-secondary" style={{ fontSize: 13 }}>Standardize automated invoice parsing with AI</p>
          </div>
        </div>

        {/* Current Status */}
        <div className="card p-md mb-md" style={{
          background: keyStatus.configured ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
          borderColor: keyStatus.configured ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {keyStatus.configured ? (
            <>
              <ShieldCheck size={22} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>Active & Encrypted</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{keyStatus.maskedKey}</div>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={22} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: 14, color: 'var(--warning)', fontWeight: 600 }}>
                Missing Configuration: AI Parsing Disabled
              </div>
            </>
          )}
        </div>

        <p className="mb-md" style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          To use <strong>AI Invoice Upload</strong>, you need a Gemini API key. You can generate one for free at{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>aistudio.google.com</a>.
        </p>

        <div className="form-group mb-md">
          <label className="form-label">{keyStatus.configured ? 'Update Security Key' : 'Enter New API Key'}</label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showKey ? 'text' : 'password'}
              placeholder="Paste your key here (e.g. AIza...)"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setSaved(false); setError(''); }}
              style={{ paddingRight: 48, height: 46 }}
            />
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-md" style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>{error}</div>
        )}

        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving || !apiKey.trim()} style={{ width: 140 }}>
          {saving ? (
            <div className="spinner" style={{ width: 18, height: 18 }}></div>
          ) : saved ? (
            <><Check size={18} /> Saved</>
          ) : (
            <><Check size={18} /> Save Key</>
          )}
        </button>

        <div className="card mt-lg p-md" style={{ background: 'var(--bg-primary)', borderStyle: 'dashed' }}>
          <div className="flex gap-sm">
            <Info size={16} className="text-accent" style={{ marginTop: 2 }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong>Security Protocol:</strong> Keys are stored in the local Electron vault. They are only injected into the main process and never touch the frontend bundle.
            </div>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="card p-lg" style={{ maxWidth: 640 }}>
        <div className="flex items-center gap-sm mb-lg">
          <SettingsIcon size={20} className="text-secondary" />
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>System Information</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px 24px', fontSize: 14 }}>
          <span className="text-muted font-medium">Software</span>
          <span className="font-semibold text-main">AF NUTRITION ERP</span>
          <span className="text-muted font-medium">Core Version</span>
          <span className="badge badge-teal" style={{ width: 'fit-content' }}>v1.0.0-Stable</span>
          <span className="text-muted font-medium">Environment</span>
          <span>Electron + Next.js (Production)</span>
          <span className="text-muted font-medium">AI Agent</span>
          <span>Gemini 2.0 Flash (Vision)</span>
          <span className="text-muted font-medium">Database</span>
          <span>SQLite 3 (Persistent)</span>
        </div>

        <div className="mt-xl pt-lg" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-sm mb-md">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <h4 style={{ fontSize: 15, fontWeight: 700 }}>Developer Operations</h4>
          </div>
          <p className="text-secondary mb-md" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            Need to reset your data or perform a clean test? Populate the application with professional demo data (products, sales logs, and sample expenses).
          </p>
          <button className="btn btn-secondary w-full btn-lg" onClick={handleSeed} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontWeight: 600 }}>
            Initialize Demo Environment
          </button>
        </div>
      </div>
    </div>
  );
}
