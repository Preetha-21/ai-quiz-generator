import { useState, useEffect } from 'react';

const API_BASE = 'https://ai-quiz-generator-backend-usr0.onrender.com';

function DashboardPage({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, [user.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/dashboard/${user.id}`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch {
      setError('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = dashboard
    ? [
        {
          icon: '📝',
          label: 'Total Quizzes',
          value: dashboard.total_quizzes,
          gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        },
        {
          icon: '📈',
          label: 'Average Score',
          value: `${dashboard.avg_score}%`,
          gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
        },
        {
          icon: '🏅',
          label: 'Highest Score',
          value: dashboard.highest_score,
          gradient: 'linear-gradient(135deg, #fbbf24, #fb923c)',
        },
        {
          icon: '⭐',
          label: 'Total Score',
          value: dashboard.total_score,
          gradient: 'linear-gradient(135deg, #34d399, #06b6d4)',
        },
      ]
    : [];

  const getDifficultyClass = (d) => {
    const map = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };
    return map[d] || 'badge-easy';
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>
          Welcome back, <span className="gradient-text">{user.name}</span> 👋
        </h2>
        <p>Here&apos;s your quiz performance overview</p>
      </div>

      {loading && (
        <div className="dash-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card dash-stat-card">
              <div className="skeleton skeleton-avatar" />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-title" style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="dash-error glass-card">
          <span>⚠️</span> {error}
          <button className="btn-secondary" onClick={fetchDashboard} style={{ marginLeft: 16 }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          {/* Stat Cards */}
          <div className="dash-grid">
            {statCards.map((card, idx) => (
              <div
                key={card.label}
                className="glass-card dash-stat-card"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div
                  className="dash-stat-icon"
                  style={{ background: card.gradient }}
                >
                  {card.icon}
                </div>
                <div className="dash-stat-info">
                  <span className="dash-stat-label">{card.label}</span>
                  <span className="dash-stat-value">{card.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Topics */}
          {dashboard.topics_attempted && dashboard.topics_attempted.length > 0 && (
            <div className="glass-card dash-section" style={{ animationDelay: '0.4s' }}>
              <h3 className="dash-section-title">🎯 Topics Explored</h3>
              <div className="dash-tags">
                {dashboard.topics_attempted.map((topic) => (
                  <span key={topic} className="dash-tag">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Results */}
          {dashboard.recent_results && dashboard.recent_results.length > 0 && (
            <div className="glass-card dash-section" style={{ animationDelay: '0.5s' }}>
              <h3 className="dash-section-title">📋 Recent Results</h3>
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_results.map((r, idx) => {
                      const pct =
                        r.total_marks > 0
                          ? Math.round((r.score / r.total_marks) * 100)
                          : 0;
                      return (
                        <tr key={idx}>
                          <td className="dash-td-topic">{r.topic}</td>
                          <td>
                            <span className={`badge ${getDifficultyClass(r.difficulty)}`}>
                              {r.difficulty}
                            </span>
                          </td>
                          <td>
                            {r.score} / {r.total_marks}
                          </td>
                          <td>
                            <div className="dash-pct-bar-wrap">
                              <div
                                className="dash-pct-bar"
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    pct >= 70
                                      ? 'var(--gradient-success)'
                                      : pct >= 40
                                      ? 'var(--gradient-gold)'
                                      : 'var(--gradient-danger)',
                                }}
                              />
                              <span className="dash-pct-label">{pct}%</span>
                            </div>
                          </td>
                          <td className="dash-td-date">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {dashboard.total_quizzes === 0 && (
            <div className="glass-card dash-section">
              <div className="empty-state">
                <span className="empty-state-icon">🚀</span>
                <h3>No quizzes taken yet</h3>
                <p>Head over to the Quiz page to take your first quiz!</p>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .dashboard-page {
          animation: fadeIn 0.4s ease;
        }

        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .dash-stat-card {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-lg);
          animation: slideUp 0.5s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .dash-stat-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          box-shadow: var(--shadow-md);
        }

        .dash-stat-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dash-stat-label {
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        .dash-stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          animation: countUp 0.6s ease;
        }

        .dash-section {
          padding: var(--space-lg);
          margin-bottom: var(--space-lg);
          animation: slideUp 0.5s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .dash-section-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: var(--space-md);
          color: var(--text-primary);
        }

        .dash-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }

        .dash-tag {
          padding: 6px 16px;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--accent-purple);
          transition: all var(--transition-base);
        }

        .dash-tag:hover {
          background: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
        }

        .dash-table-wrapper {
          overflow-x: auto;
        }

        .dash-table {
          width: 100%;
          border-collapse: collapse;
        }

        .dash-table th {
          text-align: left;
          padding: 12px 14px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
          font-weight: 600;
        }

        .dash-table td {
          padding: 12px 14px;
          font-size: 0.88rem;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .dash-table tbody tr {
          transition: background var(--transition-fast);
        }

        .dash-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .dash-td-topic {
          font-weight: 600;
          color: var(--text-primary) !important;
          text-transform: capitalize;
        }

        .dash-td-date {
          color: var(--text-muted) !important;
          font-size: 0.82rem !important;
        }

        .dash-pct-bar-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          min-width: 120px;
        }

        .dash-pct-bar {
          height: 6px;
          border-radius: var(--radius-full);
          flex: 1;
          transition: width 0.8s ease;
        }

        .dash-pct-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 36px;
        }

        .dash-error {
          padding: var(--space-lg);
          color: var(--accent-red);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }

        @media (max-width: 768px) {
          .dash-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .dash-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardPage;
