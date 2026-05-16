'use client';
import { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound } from 'lucide-react';

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(false);

    try {
      const isCorrect = await window.electronAPI.auth.verify(password);
      if (isCorrect) {
        onUnlock();
      } else {
        setError(true);
        setPassword('');
        // Shake animation effect
        const el = document.getElementById('lock-card');
        el?.classList.add('shake');
        setTimeout(() => el?.classList.remove('shake'), 500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div id="lock-card" className="lock-card">
        <div className="lock-icon-container">
          {error ? (
            <ShieldAlert className="lock-icon text-red-500 animate-pulse" size={48} />
          ) : (
            <Lock className="lock-icon text-primary" size={48} />
          )}
        </div>
        
        <div className="lock-header">
          <h2>Software Locked</h2>
          <p>Please enter your security password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="lock-form">
          <div className="input-group">
            <KeyRound className="input-icon" size={18} />
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className={error ? 'error' : ''}
            />
          </div>

          {error && <p className="error-message">Incorrect password. Please try again.</p>}

          <button type="submit" className="unlock-button" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Unlock size={18} />
                <span>Unlock System</span>
              </>
            )}
          </button>
        </form>

        <div className="lock-footer">
          <p>InBill Professional ERP v2.0.1</p>
          <span className="secure-badge">End-to-End Encrypted Storage</span>
        </div>
      </div>

      <style jsx>{`
        .lock-screen-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
        }

        .lock-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
          transition: all 0.3s ease;
        }

        .lock-icon-container {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .lock-header h2 {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .lock-header p {
          color: #94a3b8;
          font-size: 14px;
          margin-bottom: 32px;
        }

        .lock-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #64748b;
        }

        input {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 16px 14px 48px;
          color: white;
          font-size: 16px;
          outline: none;
          transition: all 0.2s;
        }

        input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        input.error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .error-message {
          color: #ef4444;
          font-size: 13px;
          font-weight: 500;
          margin-top: -12px;
        }

        .unlock-button {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .unlock-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
        }

        .unlock-button:active {
          transform: translateY(0);
        }

        .unlock-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .lock-footer {
          margin-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 24px;
        }

        .lock-footer p {
          color: #475569;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .secure-badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 100px;
        }

        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
