import { useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Something went wrong.');
        return;
      }

      onLogin(data.user);
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-container">
        <div className="login-card glass-card">
          <div className="login-header">
            <div className="login-logo">⚡</div>
            <h1 className="login-title">
              Quiz<span className="gradient-text-accent">AI</span>
            </h1>
            <p className="login-subtitle">
              AI-powered quizzes to supercharge your learning
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-loading">
                  <span className="spinner-small" />
                  Creating account...
                </span>
              ) : (
                'Get Started →'
              )}
            </button>
          </form>

          <p className="login-footer-text">
            No password needed — just enter your details to begin.
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.3;
          pointer-events: none;
        }

        .login-bg-orb-1 {
          width: 500px;
          height: 500px;
          background: var(--accent-purple);
          top: -150px;
          left: -100px;
          animation: float 8s ease-in-out infinite;
        }

        .login-bg-orb-2 {
          width: 400px;
          height: 400px;
          background: var(--accent-cyan);
          bottom: -100px;
          right: -80px;
          animation: float 10s ease-in-out infinite reverse;
        }

        .login-bg-orb-3 {
          width: 300px;
          height: 300px;
          background: var(--accent-pink);
          top: 50%;
          left: 60%;
          animation: float 12s ease-in-out infinite;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          padding: var(--space-lg);
        }

        .login-card {
          padding: var(--space-2xl);
          animation: scaleIn 0.6s ease;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }

        .login-logo {
          width: 64px;
          height: 64px;
          margin: 0 auto var(--space-md);
          background: var(--gradient-primary);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          box-shadow: var(--shadow-glow-strong);
          animation: float 4s ease-in-out infinite;
        }

        .login-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: var(--space-sm);
        }

        .login-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .login-field label {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .login-error {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          color: var(--accent-red);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          font-size: 1rem;
          margin-top: var(--space-sm);
        }

        .login-btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        .login-footer-text {
          text-align: center;
          margin-top: var(--space-lg);
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        @media (max-width: 480px) {
          .login-card {
            padding: var(--space-xl) var(--space-lg);
          }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
